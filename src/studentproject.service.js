import { Dependencies, Injectable, Logger } from '@nestjs/common'
import { createClient as createMatrixClient } from 'matrix-js-sdk'
import { ConfigService } from '@nestjs/config'
import * as _ from 'lodash'
import { Interval } from '@nestjs/schedule'
import { HttpService } from '@nestjs/axios'
import Handlebars from 'handlebars'
import fs from 'fs'
import { join } from 'path'
import locationData from '../data/locationData.json'

@Injectable()
@Dependencies(ConfigService, HttpService)
export class StudentprojectService {
  constructor (configService, httpService) {
    this.configService = configService
    this.httpService = httpService
    this.studentprojects = {}
    this.activeLocations = [] // array to store all Locations that are actually mentioned in projects
  }

  @Interval(30 * 60 * 1000) // Call this every 30 minutes
  async fetch () {
    Logger.log('Fetching student projects...')

    const result = {}
    const locationResult = []

    const configService = this.configService
    const httpService = this.httpService

    const matrixClient = createMatrixClient({
      baseUrl: this.configService.get('matrix.homeserver_base_url'),
      accessToken: this.configService.get('matrix.access_token'),
      userId: this.configService.get('matrix.user_id'),
      useAuthorizationHeader: true
    })

    function createSpaceObject (matrixClient, id, name, metaEvent, thumbnail, authors, credit, published, topicEn, topicDe, events, onlineExclusive, isLive, liveAt, parent, parentSpaceId) { // changed
      return {
        id: id,
        name: name,
        type: metaEvent.content.type,
        topicEn: topicEn,
        topicDe: topicDe,
        events: events,
        thumbnail: thumbnail ? matrixClient.mxcUrlToHttp(thumbnail, 800, 800, 'scale') : '',
        thumbnail_full_size: thumbnail ? matrixClient.mxcUrlToHttp(thumbnail) : '',
        authors: authors,
        credit: credit,
        published: published,
        onlineExclusive: onlineExclusive,
        isLive,
        liveAt,
        parent: parent,
        parentSpaceId: parentSpaceId,
        children: {}
      }
    }

    // The types of spaces we want to scan for studentprojects
    const typesOfSpaces = ['context',
      'class',
      'course',
      'institution',
      'degree program',
      'design department',
      'faculty',
      'institute',
      'semester']

    async function scanForAndAddSpaceChildren (spaceId, path, parent, parentSpaceId) {
      const stateEvents = await matrixClient.roomState(spaceId).catch(() => {})

      const metaEvent = _.find(stateEvents, { type: 'dev.medienhaus.meta' })
      if (!metaEvent) return

      const nameEvent = _.find(stateEvents, { type: 'm.room.name' })
      if (!nameEvent) return

      // const topicEvent = _.find(stateEvents, { type: 'm.room.topic' })
      const joinRulesEvent = _.find(stateEvents, { type: 'm.room.join_rules' })

      const spaceName = nameEvent.content.name

      if (metaEvent.content.deleted) return

      // robert
      const avatar = _.find(stateEvents, { type: 'm.room.avatar' })

      let credit = ''
      let published = ''
      if (metaEvent.content.credit && metaEvent.content.credit.length > 0) {
        credit = metaEvent.content.credit
      }

      if (metaEvent.content.published) {
        published = metaEvent.content.published
      } else {
        const joinRule = _.find(stateEvents, { type: 'm.room.join_rules' })

        published = joinRule.join_rule === 'invite' ? 'draft' : 'public'
      }
      if (metaEvent.content.deleted) {
        published = 'deleated'
      }

      // robert end

      if (
        metaEvent.content.type === 'studentproject' &&
        (metaEvent.content.published ? metaEvent.content.published === 'public' : (joinRulesEvent && joinRulesEvent.content.join_rule === 'public'))
      ) {
        const hierarchy = await matrixClient.getRoomHierarchy(spaceId, 50, 10)
        // fetch descriptions
        const en = hierarchy.rooms.filter(room => room.name === 'en')
        const topicEn = en[0].topic || undefined
        const de = hierarchy.rooms.filter(room => room.name === 'de')
        const topicDe = de[0].topic || undefined
        // fetch authors aka. collaborators
        const joinedMembers = await matrixClient.getJoinedRoomMembers(spaceId).catch(() => {})
        const authorNames = []
        for (const [key, value] of Object.entries(joinedMembers?.joined)) {
          authorNames.push(value.display_name)
        }
        // fetch location
        const req = {
          method: 'GET',
          headers: { Authorization: 'Bearer ' + configService.get('matrix.access_token') }
        }
        const events = hierarchy.rooms.filter(room => room.name === 'events' && !room.name.startsWith('x_'))
        // const location = hierarchy.rooms.filter(room => room.name.includes('location') && !room.name.startsWith('x_'))
        const eventResult = [] // array for events
        let onlineExclusive = true // we assume a project to be exclusively online and change this below if a location was specified

        let isLive = false // we do the same thing for the LIVE disclaimer but in reverse
        let liveAt = ''

        const today = new Date()
        const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()

        if (events.length > 0) {
          const eventHierarchy = await matrixClient.getRoomHierarchy(events[0].room_id, 50, 1)

          async function fetchContent (key) {
            const result = await httpService.axiosRef(configService.get('matrix.homeserver_base_url') + `/_matrix/client/r0/rooms/${key}/messages?limit=99&dir=b`, req)
            const data = result.data
            const htmlString = data.chunk.map(type => {
              if (type.type === 'm.room.message' && type.content['m.new_content'] === undefined && type.redacted_because === undefined) {
                return type.content.body
              } else { return null }
            }
            ).filter(x => x !== null)
            return htmlString
          }
          // @TODO one map too many
          await Promise.all(eventHierarchy.rooms.map(async (event, index) => {
            if (index === 0) return // we ignore the first result since its the event space itself
            if (event.children_state.length > 0) { // if the space has children
              const childrenResult = await Promise.all(event.children_state.map(async child => {
                const childrenHierarchy = await matrixClient.getRoomHierarchy(child.state_key, 50, 10)
                return (await Promise.all(childrenHierarchy.rooms.map(async (data, index) => {
                  // we want to return an array of objects with all information for the specific event
                  const content = await fetchContent(data.room_id)
                  const type = data.name.substring(data.name.indexOf('_') + 1)
                  const deleted = data.name.substring(0, data.name.indexOf('_')) === 'x'
                  if (type === 'location' && !deleted) {
                    onlineExclusive = false // if a room with a location exists we know the project has a physical location
                    if (content[0]) locationResult.push(content[0].split('-')[0]) // additionally we push it into our active locations array for filtering
                  }
                  // check if an event is LIVE
                  if (type === 'date') {
                    const eventDate = content[0].substring(0, content[0].indexOf(' '))
                    // fitst we check if the event is happening today
                    if (eventDate === date) {
                      // if the specified hour of the event is the current hour of day or the one just gone, we flag the project as being live
                      const eventHour = content[0].substring(content[0].indexOf(' '), content[0].indexOf(':'))
                      if (eventHour - today.getHours().toString().padStart(2, '0') <= 0 && eventHour - today.getHours().toString().padStart(2, '0') >= -1) isLive = true

                      if (eventHour - today.getHours() >= 0) {
                        liveAt = content[0].substring(content[0].indexOf(' ') + 1)
                      }
                    }
                  } // if a room with a location exists we know the project has a physical location
                  return { name: type, content: content }
                })))[0]
              }))
            } else { // otherwise we direcetly get the content of the room
              const content = await fetchContent(event.room_id)
              const type = event.name.substring(event.name.indexOf('_') + 1)
              const deleted = event.name.substring(0, event.name.indexOf('_')) === 'x'
              if (type === 'location' && !deleted) {
                onlineExclusive = false // if a room with a location exists we know the project has a physical location
                if (content[0]) locationResult.push(content[0].split('-')[0]) // additionally we push it into our active locations array for filtering
              }

              const eventDate = content[0].substring(0, content[0].indexOf(' '))
              if (eventDate === date) {
                // if the specified hour of the event is the current hour of day or the one just gone, we flag the project as being live
                const eventHour = content[0].substring(content[0].indexOf(' '), content[0].indexOf(':'))
                if (eventHour - today.getHours().toString().padStart(2, '0') <= 0 && eventHour - today.getHours().toString().padStart(2, '0') >= -1) isLive = true

                if (eventHour - today.getHours() >= 0) {
                  liveAt = content[0].substring(content[0].indexOf(' ') + 1)
                }
              }
              eventResult.push([{ name: type, content: content }])
            }
          }))
        }

        // fetch events

        _.set(result, [spaceId], createSpaceObject(matrixClient, spaceId, spaceName, metaEvent, avatar?.content.url, authorNames, credit, published, topicEn, topicDe, eventResult, onlineExclusive, isLive, liveAt, parent, parentSpaceId))
      } else {
        if (!typesOfSpaces.includes(metaEvent.content.type)) return
      }
      // _.set(result, [...path, spaceId], createSpaceObject(spaceId, spaceName, metaEvent))

      // console.log(`getting children for ${spaceId} / ${spaceName}`)

      for (const event of stateEvents) {
        if (event.type !== 'm.space.child') continue
        if (event.room_id !== spaceId) continue
        // if (event.sender !== matrixClient.getUserId()) continue

        await scanForAndAddSpaceChildren(event.state_key, [...path, spaceId, 'children'], spaceName, spaceId)
      }
    }

    await scanForAndAddSpaceChildren(this.configService.get('matrix.root_context_space_id'), [], '', null)

    this.studentprojects = result
    this.activeLocations = locationResult

    Logger.log(`Found ${Object.keys(result).length} student projects`)
  }

  getAll () {
    return this.studentprojects
  }

  getActivelocations () {
    const getLocationNames = this.activeLocations.map(locations => {
      const location = this.coordinatesToLocation(locations)
      return { name: location.name.split(',')[0], coordinates: location.coordinates.replace(', ', '/') }
    }) // get names for our coordinates
    const uniqLocations = _.uniqBy(getLocationNames, 'name') // remove doublicates
    const sortedLocations = uniqLocations.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : ((b.name.toLowerCase() > a.name.toLowerCase()) ? -1 : 0)) // sort them by name
    return sortedLocations
  }

  everydayImShuffling (data) {
    const randomProjects = []
    const ret = {}

    Object.entries(data).forEach(([key, content]) => {
      randomProjects.push(content)
    })
    for (let i = randomProjects.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [randomProjects[i], randomProjects[j]] = [randomProjects[j], randomProjects[i]]
    }
    randomProjects.forEach(project => {
      ret[Math.random() * (10000 - 0) + 0] = project
    })
    return randomProjects
  }

  getAllEvents () {
    const events = {}
    Object.entries(this.studentprojects).forEach(([key, content]) => {
      if (content.events && content.events.length > 0) {
        events[key] = content
      }
    })
    return events
  }

  getAllEventsByDay () {
    return _.transform(this.getAllEvents(), (result, studentproject, id) => {
      _.each(studentproject.events, (event) => {
        const eventInformation = this.getEventInformation({ id: id, event: event })
        _.each(eventInformation.date, (date) => {
          if (date.day) {
            result[date.day] = result[date.day] || {}
            result[date.day][id] = { ...studentproject, ...eventInformation }
          }
        })
      })
    })
  }

  getEventInformation (event) {
    const data = {}
    data.id = event.id
    event.event.forEach(entry => {
      entry.content.forEach(content => {
        if (entry.name === 'location') {
          if (data.coordinates) {
            data.coordinates.push(content)
          } else {
            data.coordinates = []
            data.coordinates.push(content)
          }
          this.coordinatesToLocation(content.split('-')[0])
          if (data.locations) {
            data.locations.push(this.coordinatesToLocation(content))
          } else {
            data.locations = []
            data.locations.push(this.coordinatesToLocation(content))
          }
        }
        if (entry.name === 'date') {
          if (data.date) {
            data.date.push({ day: content.split(' ')[0], time: content.split(' ')[1] })
          } else {
            data.date = []
            data.date.push({ day: content.split(' ')[0], time: content.split(' ')[1] })
          }
        }
        if (entry.name === 'bbb') {
          if (data.bigBlueButton) {
            data.bigBlueButton.push(content)
          } else {
            data.bigBlueButton = []
            data.bigBlueButton.push(content)
          }
        }
        if (entry.name === 'livestream') {
          if (data.livestream) {
            data.livestream.push(content)
          } else {
            data.livestream = []
            data.livestream.push(content)
          }
        }
      })
    })

    return data
  }

  coordinatesToLocation (coords) {
    const found = { ...locationData.find(location => location.coordinates.trim() === coords.split('-')[0].trim()) }
    if (found && coords.split('-')[1]) {
      found.room = coords.split('-')[1]
    }
    return found
  }

  findId (mainId, tree, flat) {
    let ret
    Object.entries(tree).forEach(([key, content]) => {
      const branch = this.searchLevel(mainId.id, { [key]: content }, {})
      if (flat) {
        const flatTree = this.flattenTree({ treeSection: branch, flattened: [] })
        if (flatTree && flatTree.flattened) {
          ret = flatTree.flattened
        }
      } else {
        ret = branch
      }
    })
    return ret
  }

  flattenTree (data) {
    Object.entries(data.treeSection).forEach(([key, content]) => {
      const tmp = { id: content.id, name: content.name }
      data.flattened.push(tmp)
      data.treeSection = content.child
      if (data.treeSection) {
        this.flattenTree(data)
      }
    })
    return data
  }

  searchLevel (id, level, parent) {
    let ret
    Object.entries(level).forEach(([key, content]) => {
      if (key === id) {
        ret = { [parent.id]: { id: parent.id, name: parent.name, child: { [id]: { id: id, name: content.name } } } }
      } else {
        if (content.children && Object.keys(content.children).length > 0) {
          Object.entries(content.children).forEach(([childK, childC]) => {
            const r = this.searchLevel(id, { [childK]: childC }, { id: key, name: content.name })
            if (r) {
              if (parent.id && Object.keys(parent.id).length > 0) {
                ret = { [parent.id]: { id: parent.id, name: parent.name, child: r } }
              } else {
                ret = r
              }
            }
          })
        }
      }
    })
    return (ret)
  }

  getProjectsByLevel (levelId, tree, onlyCurrentLevel) {
    let matchingProjects = {}
    if (onlyCurrentLevel) {
      Object.entries(this.studentprojects).forEach(([key, content]) => {
        if (content.parentSpaceId === levelId.id) {
          console.log(content.parentSpaceId)
          matchingProjects[key] = content
        }
      })
    } else {
      matchingProjects = { ...this.collectingProjectsFromCollectedChildren(levelId, tree) }
    }
    return matchingProjects
  }

  collectingProjectsFromCollectedChildren (entryId, tree) {
    const matchingProjects = {}
    Object.entries(tree).forEach(([key, content]) => {
      const collectedChildren = this.searchLevelforAllChildren(entryId.id, { [key]: content })
      Object.entries(collectedChildren).forEach(([childrenKey, childrenContent]) => {
        Object.entries(this.studentprojects).forEach(([projectKey, projectContent]) => {
          if (projectContent.parentSpaceId === childrenKey) {
            matchingProjects[projectKey] = projectContent
          }
        })
      })
    })
    return matchingProjects
  }

  searchLevelforAllChildren (id, level) {
    let ret
    Object.entries(level).forEach(([key, content]) => {
      if (key === id) {
        const foundChildrenInTreeSection = this.collectingChildrenFromEntryPoint(content, {})
        ret = { ...foundChildrenInTreeSection }
      } else {
        if (content.children && Object.keys(content.children).length > 0) {
          Object.entries(content.children).forEach(([childK, childC]) => {
            const res = this.searchLevelforAllChildren(id, { [childK]: childC })
            if (res)ret = res
          })
        }
      }
    })
    return (ret)
  }

  collectingChildrenFromEntryPoint (treeSection, foundChildren) {
    foundChildren[treeSection.id] = { id: treeSection.id, name: treeSection.name }
    if (treeSection.children && Object.keys(treeSection.children).length > 0) {
      Object.entries(treeSection.children).forEach(([key, content]) => {
        const dataFromNewLevel = this.collectingChildrenFromEntryPoint(content, foundChildren)
        foundChildren = { ...foundChildren, ...dataFromNewLevel }
      })
    }
    return foundChildren
  }

  bringingOrderToEventsAndSanitize (data) { // function can be trashed after rundgang. Not generalizable at all, just to fetch deprecated user input.
    const ret = {
      '2021-10-29': data['2021-10-29'],
      '2021-10-30': data['2021-10-30'],
      '2021-10-31': data['2021-10-31']
    }
    Object.entries(data).forEach(([key, content]) => {
      switch (key) {
        case '29.10.2021-':
          ret['2021-10-29'] = { ...ret['2021-10-29'], ...content }
          break
        case '29.10.2021-31.10.2021':
          ret['2021-10-29'] = { ...ret['2021-10-29'], ...content }
          ret['2021-10-30'] = { ...ret['2021-10-30'], ...content }
          ret['2021-10-31'] = { ...ret['2021-10-31'], ...content }
          break
        case '29.10.2021':
          ret['2021-10-29'] = { ...ret['2021-10-29'], ...content }
          break
        case '31.10.21':
          ret['2021-10-31'] = { ...ret['2021-10-31'], ...content }
          break
        case '30.10.2021':
          ret['2021-10-30'] = { ...ret['2021-10-30'], ...content }
          break
        default:
          break
      }
    })
    Object.entries(ret).forEach(([dayKey, dayContent]) => {
      if (!dayContent) {
        delete ret[dayKey]
      }
    })
    Object.entries(ret).forEach(([dayKey, dayContent]) => {
      Object.entries(dayContent).forEach(([eventKey, eventContent]) => {
        if (eventContent.date) {
          eventContent.date.forEach(date => {
            if (date.time.length === 5) {
              if (date.time[2] !== ':') {
                const d = date.time.replace('-', ':')
                date.time = d
              }
              if (/^-?\d+$/.test(date.time.substring(0, 1)) && /^-?\d+$/.test(date.time.substring(3, 4))) { // checking if both time parameter are numbers
              } else {
                date.time = 'n/a'
              }
            } else {
              date.time = 'n/a'
            }
          })
        }
      })
    })
    return ret
  }

  sortEventsByTime (data) {
    const ret = {}
    Object.entries(data).forEach(([dayKey, dayContent]) => {
      ret[dayKey] = []
      Object.entries(dayContent).forEach(([eventId, eventData]) => {
        ret[dayKey].push(eventData)
      })
      ret[dayKey].sort((a, b) => (a.date[0].time > b.date[0].time) ? 1 : -1)
    })

    return ret
  }

  getStructureElementById (id, tree) {
    return this.getStructureElementByIdFunction(id.id, tree)
  }

  getStructureElementByIdFunction (id, tree) {
    let ret
    Object.entries(tree).forEach(([key, content]) => {
      if (key === id) {
        ret = content
      } else {
        if (content.children && Object.keys(content.children).length > 0) {
          Object.entries(content.children).forEach(([childKey, childContent]) => {
            const res = this.getStructureElementByIdFunction(id, { [childKey]: childContent })
            if (res) {
              ret = res
            }
          })
        }
      }
    })
    return ret
  }

  getStrucureElementByIdFilteredOutEmptyOnes (level, tree) {
    const ret = { ...level }
    if (Object.keys(ret.children).length === 0) {
      delete ret.children
      return ret
    }
    Object.entries(level.children).forEach(([key, content]) => {
      const projects = this.getProjectsByLevel({ id: key }, tree, false)
      if (Object.keys(projects).length === 0) {
        delete ret.children[key]
      }
    })
    return ret
  }

  getByContextSpaceIds (contextSpaceIds) {
    return _.filter(this.studentprojects, content => contextSpaceIds.includes(content.parentSpaceId))
  }

  // Return all student projects that happen at a given location
  getByLocation (lat, lng) {
    return _.filter(this.studentprojects, (project) =>
      _.some(project.events, (event) =>
        _.some(event, (eventProperty) =>
          eventProperty.name === 'location' && _.some(eventProperty.content, (content) =>
            _.startsWith(content, `${lat}, ${lng}-`)
          )
        )
      )
    )
  }

  async get (id, language = 'en') {
    if (!this.studentprojects[id]) {
      return null
    }
    const { content, formattedContent } = await this.getContent(id, language)
    return { ...this.studentprojects[id], content, formatted_content: formattedContent }
  }

  async getContent (projectSpaceId, language) {
    const contentBlocks = await this.getContentBlocks(projectSpaceId, language)

    return {
      content: contentBlocks,
      formattedContent: Object.keys(contentBlocks).map(index => contentBlocks[index].formatted_content).join('')
    }
  }

  async getContentBlocks (projectSpaceId, language) {
    const result = {}
    const matrixClient = createMatrixClient({
      baseUrl: this.configService.get('matrix.homeserver_base_url'),
      accessToken: this.configService.get('matrix.access_token'),
      userId: this.configService.get('matrix.user_id'),
      useAuthorizationHeader: true
    })

    // Get the spaces for the available languages
    const languageSpaces = {}
    const spaceSummary = await matrixClient.getSpaceSummary(projectSpaceId, 0)
    spaceSummary.rooms.map(languageSpace => {
      if (languageSpace.room_id == projectSpaceId) return
      languageSpaces[languageSpace.name] = languageSpace.room_id
    })

    // Get the actual content block rooms for the given language
    const contentRooms = await matrixClient.getSpaceSummary(languageSpaces[language], 0)

    await Promise.all(contentRooms.rooms.map(async (contentRoom) => {
      // Skip the language space itself
      if (contentRoom.room_id === languageSpaces[language]) return

      // Get the last message of the current content room
      const lastMessage = (await this.httpService.axiosRef(this.configService.get('matrix.homeserver_base_url') + `/_matrix/client/r0/rooms/${contentRoom.room_id}/messages`, {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + this.configService.get('matrix.access_token') },
        params: {
          // @TODO Skip deleted messages
          limit: 1,
          dir: 'b',
          // Only consider m.room.message events
          filter: JSON.stringify({ types: ['m.room.message'] })
        }
      })).data.chunk[0]

      if (!lastMessage) return

      const type = contentRoom.name.substring(contentRoom.name.indexOf('_') + 1)
      const content = (() => {
        switch (type) {
          case 'audio':
          case 'image':
            return matrixClient.mxcUrlToHttp(lastMessage.content.url)
          default: return lastMessage.content.body
        }
      })()
      const formattedContent = (() => {
        switch (type) {
          // For text, ul and ol we just return whatever's stored in the Matrix event's formatted_body
          case 'text':
          case 'ul':
          case 'ol':
            return lastMessage.content.formatted_body
          // For all other types we render the HTML using the corresponding Handlebars template in /views/contentBlocks
          default: return Handlebars.compile(fs.readFileSync(join(__dirname, '..', 'views', 'contentBlocks', `${type}.hbs`), 'utf8'))({
            content,
            matrixEventContent: lastMessage.content
          })
        }
      })()

      // Append this content block's data to our result set
      result[contentRoom.name.substring(0, contentRoom.name.indexOf('_'))] = {
        type,
        content,
        formatted_content: formattedContent
      }
    }))

    return result
  }
}
