import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { join } from 'path'
import hbs from 'hbs'

async function bootstrap () {
  const app = await NestFactory.create(AppModule)

  app.useStaticAssets(join(__dirname, '..', 'public'))
  app.setBaseViewsDir(join(__dirname, '..', 'views'))
  hbs.registerPartials(join(__dirname, '..', 'views', 'partials'))
  hbs.registerPartials(join(__dirname, '..', 'views', 'contentBlocks'))
  app.setViewEngine('hbs')

  await app.listen(3004)
}
bootstrap()
