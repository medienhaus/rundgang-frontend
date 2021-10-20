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
  @Render('index.hbs')
  root () {}

  @Get('/programm')
  @Render('programm.hbs')
  getAll () {
    return { studentprojects: this.studentprojectService.getAll() }
  }

  @Get('/beratungsangebote')
  @Render('programm.hbs')
  getBeratungsangebote () {
    return {
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

  @Get('/c/:id')
  @Bind(Param())
  @Render('studentproject.hbs')
  async getStudentproject ({ id }) {
    const project = await this.studentprojectService.get(id)
    if (!project) throw new NotFoundException()
    return { studentproject: project }
  }

  @Get('/api/all')
  apiGetAll () {
    return this.studentprojectService.getAll()
  }

  @Get('/api/structure')
  apiGetStructure () {
    return process.env.NODE_ENV === 'local' ? strukturDev : struktur
  }

  @Get('/api/:id')
  @Bind(Param())
  async apiGetSingle ({ id }) {
    const project = await this.studentprojectService.get(id)
    if (!project) throw new NotFoundException()
    return project
  }
}
