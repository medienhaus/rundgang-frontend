import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { join } from 'path'
import hbs from 'hbs'
import moment from 'moment'

async function bootstrap () {
  const app = await NestFactory.create(AppModule)

  app.useStaticAssets(join(__dirname, '..', 'public'))
  app.setBaseViewsDir(join(__dirname, '..', 'views'))
  hbs.registerPartials(join(__dirname, '..', 'views'))
  // hbs.registerPartials(join(__dirname, '..', 'views', 'contentBlocks'))
  // hbs.registerHelper('navigationMenu', function ({ ...data }) {
  //   if (data.data.root.language === 'en') return 'en/header'
  //
  //   return 'header'
  // })
  hbs.registerHelper('greaterThan', function (length, index, options) {
    if (length > 1 && index < length - 1) {
      return options.fn(this)
    }
    return options.inverse(this)
  })
  hbs.registerHelper('formatDateEnglish', function (a) {
    return moment(a).isValid() ? moment(a).format('dddd, LL') : a
  })
  hbs.registerHelper('formatDateGerman', function (a) {
    return moment(a).isValid() ? moment(a).locale('de').format('dddd, LL') : a
  })
  app.setViewEngine('hbs')

  await app.listen(3004)
}
bootstrap()
