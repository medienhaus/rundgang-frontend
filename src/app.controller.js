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
    return { languageSwitchLink: `/en/c/${id}`, studentproject: project }
  }

  @Get('/en/c/:id')
  @Bind(Param())
  @Render('en/studentproject.hbs')
  async getStudentprojectEnglish ({ id }) {
    const project = await this.studentprojectService.get(id, 'en')
    if (!project) throw new NotFoundException()
    return { languageSwitchLink: `/c/${id}`, studentproject: project }
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
    return this.studentprojectService.getAllEventsByDay()
  }

  @Get('/api/:id')
  @Bind(Param())
  async apiGetSingle ({ id }) {
    const project = await this.studentprojectService.get(id)
    if (!project) throw new NotFoundException()
    return project
  }
}
