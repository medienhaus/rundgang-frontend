import { Dependencies, Injectable, Logger } from '@nestjs/common'
import { createClient as createMatrixClient } from 'matrix-js-sdk'
import { ConfigService } from '@nestjs/config'
import * as _ from 'lodash'
import { Interval } from '@nestjs/schedule'
import { HttpService } from '@nestjs/axios'
import Handlebars from 'handlebars'
import fs from 'fs'
import { join } from 'path'

@Injectable()
@Dependencies(ConfigService, HttpService)
export class StudentprojectService {
  constructor (configService, httpService) {
    this.configService = configService
    this.httpService = httpService
    this.studentprojects = {}
  }

  @Interval(60 * 60 * 1000) // Call this every 20 minutes
  async fetch () {
    Logger.log('Fetching student projects...')

    const result = {}

    const configService = this.configService
    const httpService = this.httpService

    const matrixClient = createMatrixClient({
      baseUrl: this.configService.get('matrix.homeserver_base_url'),
      accessToken: this.configService.get('matrix.access_token'),
      userId: this.configService.get('matrix.user_id'),
      useAuthorizationHeader: true
    })

    function createSpaceObject (id, name, metaEvent, thumbnail, authors, credit, published, topicEn, topicDe, events, parent) { // changed
      return {
        id: id,
        name: name,
        type: metaEvent.content.type,
        topicEn: topicEn,
        topicDe: topicDe,
        events: events,
        thumbnail: thumbnail,
        authors: authors,
        credit: credit,
        published: published,
        parent: parent,
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

    async function scanForAndAddSpaceChildren (spaceId, path, parent) {
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
      const avatar = await matrixClient.getStateEvent(spaceId, 'm.room.avatar').catch(() => {})
      let avatarUrl = ''
      if (avatar) {
        avatarUrl = await matrixClient.mxcUrlToHttp(avatar.url)
      }

      const joinedMembers = await matrixClient.getJoinedRoomMembers(spaceId)
      const authorNames = []

      for (const [key, value] of Object.entries(joinedMembers.joined)) {
        authorNames.push(value.display_name)
      }

      let credit = ''
      let published = ''
      if (metaEvent.content.credit && metaEvent.content.credit.length > 0) {
        credit = metaEvent.content.credit
      }

      if (metaEvent.content.published) {
        published = metaEvent.content.published
      } else {
        const joinRule = await matrixClient.getStateEvent(spaceId, 'm.room.join_rules').catch(() => { }) // cleanup legacy

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
        // fetch location
        const req = {
          method: 'GET',
          headers: { Authorization: 'Bearer ' + configService.get('matrix.access_token') }
        }
        const events = hierarchy.rooms.filter(room => room.name === 'events' && !room.name.startsWith('x_'))
        // const location = hierarchy.rooms.filter(room => room.name.includes('location') && !room.name.startsWith('x_'))
        if (events.length < 1) return
        const eventHierarchy = await matrixClient.getRoomHierarchy(events[0].room_id, 50, 1)

        async function fetchContent (roomId) {
          const result = await httpService.axiosRef(configService.get('matrix.homeserver_base_url') + `/_matrix/client/r0/rooms/${roomId}/messages?limit=99&dir=b`, req)
          const data = result.data
          const htmlString = data.chunk.map(type => {
            if (type.type === 'm.room.message' && type.content['m.new_content'] === undefined && type.redacted_because === undefined) {
              return type.content.body
            } else { return null }
          }
          ).filter(x => x !== null)
          return htmlString
        }
        const eventResult = [] // array for events
        // @TODO one map too many
        await Promise.all(eventHierarchy.rooms.map(async (event, index) => {
          if (index === 0) return // we ignore the first result since its the event space itself
          if (event.children_state.length > 0) { // if the space has children
            const childrenResult = await Promise.all(event.children_state.map(async child => {
              const childrenHierarchy = await matrixClient.getRoomHierarchy(child.state_key, 50, 10)
              return (await Promise.all(childrenHierarchy.rooms.map(async (data, index) => {
                // we want to return an array of object with all information for the specific event
                const content = await fetchContent(data.room_id)
                return { name: data.name.substring(data.name.indexOf('_') + 1), content: content }
              })))[0]
            }))
            eventResult.push(childrenResult)
          } else { // otherwise we direcetly get the content of the room
            const content = await fetchContent(event.room_id)
            eventResult.push([{ name: event.name.substring(event.name.indexOf('_') + 1), content: content }])
          }
        }))
        // console.log(eventArray.filter(event => event))

        // fetch events

        _.set(result, [spaceId], createSpaceObject(spaceId, spaceName, metaEvent, avatarUrl, authorNames, credit, published, topicEn, topicDe, eventResult, parent))
      } else {
        if (!typesOfSpaces.includes(metaEvent.content.type)) return
      }

      // _.set(result, [...path, spaceId], createSpaceObject(spaceId, spaceName, metaEvent))

      // console.log(`getting children for ${spaceId} / ${spaceName}`)

      for (const event of stateEvents) {
        if (event.type !== 'm.space.child') continue
        if (event.room_id !== spaceId) continue
        // if (event.sender !== matrixClient.getUserId()) continue

        await scanForAndAddSpaceChildren(event.state_key, [...path, spaceId, 'children'], spaceName)
      }
    }

    await scanForAndAddSpaceChildren(this.configService.get('matrix.root_context_space_id'), [], '')

    this.studentprojects = result

    Logger.log(`Found ${Object.keys(result).length} student projects`)
  }

  getAll () {
    return this.studentprojects
  }

  getAllEvents () {
    const events = {}
    Object.entries(this.studentprojects).forEach(([k, c]) => {
      if (c.location) {
        events[k] = c
      }
    })
    return events
  }

  getAllEventsByDay () {
    const days = {
      '30.10.11': this.getAllEvents()
    }
    return days
  }

  async get (id) {
    const { content, formattedContent } = await this.getContent(id, 'en')
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
