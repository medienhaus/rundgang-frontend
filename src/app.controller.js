import { Bind, Controller, Dependencies, Get, NotFoundException, Param, Render } from '@nestjs/common'
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

  @Get('/programm')
  @Render('de/programm.hbs')
  getAllEnglish () {
    return { languageSwitchLink: '/en/program', studentprojects: this.studentprojectService.getAll() }
  }

  @Get('/en/program')
  @Render('en/program.hbs')
  getAll () {
    return { languageSwitchLink: '/programm', studentprojects: this.studentprojectService.getAll() }
  }

  @Get('/beratungsangebote')
  @Render('de/programm.hbs')
  getBeratungsangebote () {
    return {
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
    return { languageSwitchLink: '/en/events', eventsByDay: this.studentprojectService.getAllEventsByDay() }
  }

  @Get('/en/events')
  @Render('en/events.hbs')
  getAllEventsEnglish () {
    return { languageSwitchLink: '/zeitplan', eventsByDay: this.studentprojectService.getAllEventsByDay() }
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

  @Get('/c/:id')
  @Bind(Param())
  @Render('de/studentproject.hbs')
  async getStudentproject ({ id }) {
    const project = await this.studentprojectService.get(id, 'de')
    if (!project) throw new NotFoundException()
    const parentId = project.parentSpaceId
    return { languageSwitchLink: `/en/c/${id}`, studentproject: project, bubbles: this.studentprojectService.findId({ id: parentId }, this.apiGetStructure(), true) }
  }

  @Get('/en/c/:id')
  @Bind(Param())
  @Render('en/studentproject.hbs')
  async getStudentprojectEnglish ({ id }) {
    const project = await this.studentprojectService.get(id, 'en')
    if (!project) throw new NotFoundException()
    const parentId = project.parentSpaceId
    return { languageSwitchLink: `/c/${id}`, studentproject: project, bubbles: this.studentprojectService.findId({ id: parentId }, this.apiGetStructure(), true) }
  }

  @Get('/filter/structure/:id')
  @Bind(Param())
  @Render('de/structureFilter.hbs')
  getFilterByStructureElement ({ id }) {
    const matchedStudentProjects = this.studentprojectService.getProjectsByLevel({ id }, this.apiGetStructure(), false)
    if (!matchedStudentProjects) throw new NotFoundException()
    return { languageSwitchLink: `/en/filter/structure/${id}`, studentprojects: matchedStudentProjects, filterData: this.studentprojectService.getStructureElementById({ id }, this.apiGetStructure()), filterParents: this.studentprojectService.findId({ id }, this.apiGetStructure(), true) }
  }

  @Get('/en/filter/structure/:id')
  @Bind(Param())
  @Render('de/structureFilter.hbs')
  getFilterByStructureElementEnglish ({ id }) {
    const matchedStudentProjects = this.studentprojectService.getProjectsByLevel({ id }, this.apiGetStructure(), false)
    console.log(this.studentprojectService.getStructureElementById({ id }, this.apiGetStructure()))
    if (!matchedStudentProjects) throw new NotFoundException()
    return { languageSwitchLink: `/filter/structure/${id}`, studentprojects: matchedStudentProjects, filterData: this.studentprojectService.getStructureElementById({ id }, this.apiGetStructure()), filterParents: this.studentprojectService.findId({ id }, this.apiGetStructure(), true) }
  }

  @Get('/filter/user/:id')
  @Bind(Param())
  @Render('de/userFilter.hbs')
  async getFilterByUserId ({ id }) {
    const userData = await this.studentprojectService.getUserDataByUserId({ id })
    if (!userData) throw new NotFoundException()
    return { languageSwitchLink: `/en/filter/user/${id}`, userData: userData }
  }

  @Get('/en/filter/user/:id')
  @Bind(Param())
  @Render('de/userFilter.hbs')
  async getFilterByUserIdEnglish ({ id }) {
    const userData = await this.studentprojectService.getUserDataByUserId({ id })
    if (!userData) throw new NotFoundException()
    return { languageSwitchLink: `/filter/user/${id}`, userData: userData }
  }

  // --------REST API's---------- //

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
    return this.studentprojectService.getAllEventsByDay()
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

  @Get('/api/user/:id/')
  @Bind(Param())
  apiGetUserDataByUserId ({ id }) {
    const userdata = this.studentprojectService.getUserDataByUserId({ id })
    if (!userdata) throw new NotFoundException()
    return userdata
  }

  @Get('/api/:id')
  @Bind(Param())
  async apiGetSingle ({ id }) {
    const project = await this.studentprojectService.get(id)
    if (!project) throw new NotFoundException()
    return project
  }
}
