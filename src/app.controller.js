import { Bind, Controller, Dependencies, Get, NotFoundException, Param, Render, Response } from '@nestjs/common'
import { AppService } from './app.service'
import struktur from '../data/struktur'
import strukturDev from '../data/struktur-dev'

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
  @Render('de/program.hbs')
  @Bind(Param('contextSpaceId'))
  getAll (contextSpaceId) {
    // If we are not filtering by a given context show the filter data for the root context
    if (!contextSpaceId) contextSpaceId = Object.keys(this.apiGetStructure())[0]

    return {
      pageTitle: 'Programm',
      activePageProgram: true,
      languageSwitchLink: '/en/programme',
      studentprojects: contextSpaceId
        ? this.studentprojectService.getProjectsByLevel({ id: contextSpaceId }, this.apiGetStructure(), false)
        : this.studentprojectService.getAll(),
      filterData: this.studentprojectService.getStrucureElementByIdFilteredOutEmptyOnes(this.studentprojectService.getStructureElementById({ id: contextSpaceId }, this.apiGetStructure()), this.apiGetStructure()),
      filterParents: this.studentprojectService.findId({ id: contextSpaceId }, this.apiGetStructure(), true)
    }
  }

  @Get('/en/programme/:contextSpaceId?')
  @Render('en/program.hbs')
  @Bind(Param('contextSpaceId'))
  getAllEnglish (contextSpaceId) {
    // If we are not filtering by a given context show the filter data for the root context
    if (!contextSpaceId) contextSpaceId = Object.keys(this.apiGetStructure())[0]

    return {
      pageTitle: 'Programme',
      activePageProgram: true,
      languageSwitchLink: '/programm',
      studentprojects: contextSpaceId
        ? this.studentprojectService.getProjectsByLevel({ id: contextSpaceId }, this.apiGetStructure(), false)
        : this.studentprojectService.getAll(),
      filterData: this.studentprojectService.getStrucureElementByIdFilteredOutEmptyOnes(this.studentprojectService.getStructureElementById({ id: contextSpaceId }, this.apiGetStructure()), this.apiGetStructure()),
      filterParents: this.studentprojectService.findId({ id: contextSpaceId }, this.apiGetStructure(), true)
    }
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
    return { pageTitle: 'Zeitplan Einzelveranstaltungen', languageSwitchLink: '/en/events', eventsByDay: this.studentprojectService.bringingOrderToEventsAndSanitize(this.studentprojectService.getAllEventsByDay()) }
  }

  @Get('/en/events')
  @Render('en/events.hbs')
  getAllEventsEnglish () {
    return { pageTitle: 'Event Calendar', languageSwitchLink: '/zeitplan', eventsByDay: this.studentprojectService.bringingOrderToEventsAndSanitize(this.studentprojectService.getAllEventsByDay()) }
  }

  @Get('/orte')
  @Render('de/locations.hbs')
  getAllLocations () {
    return { languageSwitchLink: '/en/locations' }
  }

  @Get('/en/locations')
  @Render('en/locations.hbs')
  getAllLocationsEngl () {
    return { languageSwitchLink: '/orte' }
  }

  @Get('/einlasszeiten')
  @Render('de/hours.hbs')
  hours () { return { languageSwitchLink: '/en/admission-times' } }

  @Get('/en/admission-times')
  @Render('en/hours.hbs')
  hoursEnglish () { return { languageSwitchLink: '/einlasszeiten' } }

  @Get('/c/:id')
  @Bind(Response(), Param())
  async getStudentproject (res, { id }) {
    const project = await this.studentprojectService.get(id, 'de')
    if (!project) throw new NotFoundException()
    // If there's no German content for this project redirect to the English version
    if (project.formatted_content === '' && !project.topicDe) return res.redirect(`/en/c/${id}`)

    return res.render('de/studentproject.hbs', {
      pageTitle: project.name,
      languageSwitchLink: `/en/c/${id}`,
      studentproject: project,
      bubbles: this.studentprojectService.findId({ id: project.parentSpaceId }, this.apiGetStructure(), true)
    })
  }

  @Get('/en/c/:id')
  @Bind(Response(), Param())
  async getStudentprojectEnglish (res, { id }) {
    const project = await this.studentprojectService.get(id, 'en')
    if (!project) throw new NotFoundException()
    // If there's no English content for this project redirect to the German version
    if (project.formatted_content === '' && !project.topicEn) return res.redirect(`/c/${id}`)

    return res.render('en/studentproject.hbs', {
      pageTitle: project.name,
      languageSwitchLink: `/c/${id}`,
      studentproject: project,
      bubbles: this.studentprojectService.findId({ id: project.parentSpaceId }, this.apiGetStructure(), true)
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
    return this.studentprojectService.bringingOrderToEventsAndSanitize(this.studentprojectService.getAllEventsByDay())
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
}
