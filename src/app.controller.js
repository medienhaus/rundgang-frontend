import { Bind, Controller, Dependencies, Get, NotFoundException, HttpException, HttpStatus, Param, Render, Response } from '@nestjs/common'
import { AppService } from './app.service'
import struktur from '../data/struktur'
import strukturDev from '../data/struktur-dev'
import _ from 'lodash'
import locationData from '../data/locationData.json'

@Controller()
@Dependencies(AppService, 'STUDENTPROJECT_PROVIDER')
export class AppController {
  constructor (appService, studentprojectService) {
    this.appService = appService
    this.studentprojectService = studentprojectService
  }

  @Get('/')
  @Render('de/index.hbs')
  root () { return { languageSwitchLink: '/en' } }

  @Get('/en')
  @Render('en/index.hbs')
  rootEnglish () { return { languageSwitchLink: '/' } }

  @Get('/programm/:contextSpaceId?')
  @Bind(Response(), Param('contextSpaceId'))
  getAll (res, contextSpaceId) {
    const substructureActive = !contextSpaceId
    if (contextSpaceId && contextSpaceId === Object.keys(this.apiGetStructure())[0]) {
      return res.redirect('/programm')
    }
    // If we are not filtering by a given context show the filter data for the root context
    if (!contextSpaceId) contextSpaceId = Object.keys(this.apiGetStructure())[0]

    const projects = contextSpaceId ? this.studentprojectService.getProjectsByLevel({ id: contextSpaceId }, this.apiGetStructure(), false) : this.studentprojectService.getAll()
    return res.render('de/program.hbs', {
      pageTitle: 'Programm',
      activePageProgram: true,
      languageSwitchLink: '/en/programme',
      studentprojects: this.studentprojectService.everydayImShuffling(projects),
      filterData: this.studentprojectService.getStrucureElementByIdFilteredOutEmptyOnes(this.studentprojectService.getStructureElementById({ id: contextSpaceId }, this.apiGetStructure()), this.apiGetStructure()),
      filterParents: this.studentprojectService.findId({ id: contextSpaceId }, this.apiGetStructure(), true).filter(parent => parent.id && parent.id !== Object.keys(this.apiGetStructure())[0]),
      activeLocations: this.studentprojectService.getActivelocations(),
      substructureActive: substructureActive
    })
  }

  @Get('/en/programme/:contextSpaceId?')
  @Bind(Response(), Param('contextSpaceId'))
  getAllEnglish (res, contextSpaceId) {
    // If we are not filtering by a given context show the filter data for the root context

    const substructureActive = !contextSpaceId
    if (contextSpaceId && contextSpaceId === Object.keys(this.apiGetStructure())[0]) {
      return res.redirect('/en/programme')
    }

    if (!contextSpaceId) contextSpaceId = Object.keys(this.apiGetStructure())[0]

    const projects = contextSpaceId ? this.studentprojectService.getProjectsByLevel({ id: contextSpaceId }, this.apiGetStructure(), false) : this.studentprojectService.getAll()
    return res.render('en/program.hbs', {
      pageTitle: 'Programme',
      activePageProgram: true,
      languageSwitchLink: '/programm',
      studentprojects: this.studentprojectService.everydayImShuffling(projects),
      filterData: this.studentprojectService.getStrucureElementByIdFilteredOutEmptyOnes(this.studentprojectService.getStructureElementById({ id: contextSpaceId }, this.apiGetStructure()), this.apiGetStructure()),
      filterParents: this.studentprojectService.findId({ id: contextSpaceId }, this.apiGetStructure(), true).filter(parent => parent.id && parent.id !== Object.keys(this.apiGetStructure())[0]),
      activeLocations: this.studentprojectService.getActivelocations(),
      substructureActive: substructureActive
    })
  }

  @Get('/programm/ort/:lat/:lng')
  @Bind(Response(), Param())
  getProgrammeByLocation (res, { lat, lng }) {
    // Make sure this is a valid lat/lng combination, otherwise forward to /programm
    const location = _.find(locationData, { coordinates: `${lat}, ${lng}` })
    if (!location) return res.redirect('/programm')

    return res.render('de/program.hbs', {
      pageTitle: 'Programm',
      activePageProgram: true,
      languageSwitchLink: `/en/programme/location/${lat}/${lng}`,
      studentprojects: this.studentprojectService.getByLocation(lat, lng),
      locationData: location
    })
  }

  @Get('/en/programme/location/:lat/:lng')
  @Bind(Response(), Param())
  getProgrammeByLocationEnglish (res, { lat, lng }) {
    // Make sure this is a valid lat/lng combination, otherwise forward to /en/programme
    const location = _.find(locationData, { coordinates: `${lat}, ${lng}` })
    if (!location) return res.redirect('/en/programme')

    return res.render('en/program.hbs', {
      pageTitle: 'Programme',
      activePageProgram: true,
      languageSwitchLink: `/programm/ort/${lat}/${lng}`,
      studentprojects: this.studentprojectService.getByLocation(lat, lng),
      locationData: location
    })
  }

  @Get('/beratungsangebote')
  @Render('de/program.hbs')
  getBeratungsangebote () {
    return {
      pageTitle: 'Beratungsangebote',
      activePageAdvisoryServices: true,
      languageSwitchLink: '/en/advisory-services',
      studentprojects: this.studentprojectService.getByContextSpaceIds([
        '!tqonxsqROerKlklkKl:content.udk-berlin.de', // Zentralinstitut für Weiterbildung (ZIW)
        '!YehuBeeJpRWuYmeVWz:content.udk-berlin.de', // Universitätsbibliothek
        '!PIZnKjMWljdFHfugiJ:content.udk-berlin.de', // Berlin Career College
        '!leNHytnZdIfmkxQKIe:content.udk-berlin.de', // Artist Training (eingeordnet unter "Berlin Career College")
        '!eBKDDBPyVbxnUYLQHQ:content.udk-berlin.de', // International Office
        '!ikWOqOsHeWtDpXiaZk:content.udk-berlin.de', // Allgemeine Studienberatung
        '!WfLvMMfXpFaSuqyqPE:content.udk-berlin.de', // Frauenbeauftragte
        '!lsoUcOlTSDYmqTukyb:content.udk-berlin.de' //  Studium Generale
      ])
    }
  }

  @Get('/en/advisory-services')
  @Render('en/program.hbs')
  getBeratungsangeboteEnglish () {
    return {
      pageTitle: 'Advisory Services',
      activePageAdvisoryServices: true,
      languageSwitchLink: '/beratungsangebote',
      studentprojects: this.studentprojectService.getByContextSpaceIds([
        '!tqonxsqROerKlklkKl:content.udk-berlin.de', // Zentralinstitut für Weiterbildung (ZIW)
        '!YehuBeeJpRWuYmeVWz:content.udk-berlin.de', // Universitätsbibliothek
        '!PIZnKjMWljdFHfugiJ:content.udk-berlin.de', // Berlin Career College
        '!leNHytnZdIfmkxQKIe:content.udk-berlin.de', // Artist Training (eingeordnet unter "Berlin Career College")
        '!eBKDDBPyVbxnUYLQHQ:content.udk-berlin.de', // International Office
        '!ikWOqOsHeWtDpXiaZk:content.udk-berlin.de', // Allgemeine Studienberatung
        '!WfLvMMfXpFaSuqyqPE:content.udk-berlin.de', // Frauenbeauftragte
        '!lsoUcOlTSDYmqTukyb:content.udk-berlin.de' //  Studium Generale
      ])
    }
  }

  @Get('/zeitplan')
  @Render('de/events.hbs')
  getAllEvents () {
    return {
      pageTitle: 'Zeitplan Einzelveranstaltungen',
      languageSwitchLink: '/en/events',
      eventsByDay: this.studentprojectService.sortEventsByTime(this.studentprojectService.bringingOrderToEventsAndSanitize(this.studentprojectService.getAllEventsByDay()))
    }
  }

  @Get('/en/events')
  @Render('en/events.hbs')
  getAllEventsEnglish () {
    return {
      pageTitle: 'Event Calendar',
      languageSwitchLink: '/zeitplan',
      eventsByDay: this.studentprojectService.sortEventsByTime(this.studentprojectService.bringingOrderToEventsAndSanitize(this.studentprojectService.getAllEventsByDay()))
    }
  }

  @Get('/orte')
  @Render('de/locations.hbs')
  getAllLocations () {
    return {
      pageTitle: 'Orte',
      activePageLocations: true,
      languageSwitchLink: '/en/locations'
    }
  }

  @Get('/en/locations')
  @Render('en/locations.hbs')
  getAllLocationsEngl () {
    return {
      pageTitle: 'Locations',
      activePageLocations: true,
      languageSwitchLink: '/orte'
    }
  }

  @Get('/c/:id')
  @Bind(Response(), Param())
  async getStudentproject (res, { id }) {
    const project = await this.studentprojectService.get(id, 'de')
    if (!project) return this.customError(res)

    // If there's no German content for this project redirect to the English version
    if (project.formatted_content === '' && !project.topicDe) return res.redirect(`/en/c/${id}`)

    return res.render('de/studentproject.hbs', {
      pageTitle: project.name,
      languageSwitchLink: `/en/c/${id}`,
      studentproject: project,
      eventInformation: _.map(project.events, (event) => this.studentprojectService.getEventInformation({ id: id, event: event })),
      bubbles: {
        context: this.studentprojectService.findId({ id: project.parentSpaceId }, this.apiGetStructure(), true)
      }
    })
  }

  @Get('/en/c/:id')
  @Bind(Response(), Param())
  async getStudentprojectEnglish (res, { id }) {
    const project = await this.studentprojectService.get(id, 'en')
    if (!project) return this.customErrorEN(res)

    // If there's no English content for this project redirect to the German version
    if (project.formatted_content === '' && !project.topicEn) return res.redirect(`/c/${id}`)

    return res.render('en/studentproject.hbs', {
      pageTitle: project.name,
      languageSwitchLink: `/c/${id}`,
      studentproject: project,
      eventInformation: _.map(project.events, (event) => this.studentprojectService.getEventInformation({ id: id, event: event })),
      bubbles: {
        context: this.studentprojectService.findId({ id: project.parentSpaceId }, this.apiGetStructure(), true)
      }
    })
  }

  @Get('/api/all')
  apiGetAll () {
    return this.studentprojectService.getAll()
  }

  @Get('/api/structure')
  apiGetStructure () {
    return process.env.NODE_ENV === 'local' ? strukturDev : struktur
  }

  @Get('/api/events')
  apiGetEvents () {
    return this.studentprojectService.getAllEvents()
  }

  @Get('/api/events/day')
  apiGetEventsByDay () {
    return this.studentprojectService.sortEventsByTime(this.studentprojectService.bringingOrderToEventsAndSanitize(this.studentprojectService.getAllEventsByDay()))
  }

  @Get('/api/struct/:id/branch')
  @Bind(Param())
  apiGetBranchById ({ id }) {
    const branch = this.studentprojectService.findId({ id }, this.apiGetStructure(), false)
    if (!branch) throw new NotFoundException()
    return branch
  }

  @Get('/api/struct/:id/flatBranch')
  @Bind(Param())
  apiGetFlatBranchById ({ id }) {
    const branch = this.studentprojectService.findId({ id }, this.apiGetStructure(), true)
    if (!branch) throw new NotFoundException()
    return branch
  }

  @Get('/api/struct/:id/projects')
  @Bind(Param())
  apiGetProjectsByLevel ({ id }) {
    const projects = this.studentprojectService.getProjectsByLevel({ id }, this.apiGetStructure(), true)
    if (!projects) throw new NotFoundException()
    return projects
  }

  @Get('/api/struct/:id/projects/withChildLevels')
  @Bind(Param())
  apiGetProjectsByLevelWithChildLevel ({ id }) {
    const projects = this.studentprojectService.getProjectsByLevel({ id }, this.apiGetStructure(), false)
    if (!projects) throw new NotFoundException()
    return projects
  }

  @Get('/api/:id')
  @Bind(Param())
  async apiGetSingle ({ id }) {
    const project = await this.studentprojectService.get(id)
    if (!project) throw new NotFoundException()
    return project
  }

  customError (res) {
    res.status(HttpStatus.NOT_FOUND)
    return res.render('de/error.hbs', {})
  }

  customErrorEN (res) {
    res.status(HttpStatus.NOT_FOUND)
    return res.render('en/error.hbs', {})
  }
}
