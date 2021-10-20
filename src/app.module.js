import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ConfigModule, ConfigService } from '@nestjs/config'
import configuration from '../config'
import { StudentprojectService } from './studentproject.service'
import { ScheduleModule } from '@nestjs/schedule'
import { HttpModule, HttpService } from '@nestjs/axios'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration]
    }),
    ScheduleModule.forRoot(),
    HttpModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'STUDENTPROJECT_PROVIDER',
      inject: [ConfigService, HttpService],
      useFactory: async (configService, httpService) => {
        const x = new StudentprojectService(configService, httpService)
        await x.fetch()
        return x
      }
    }
  ]
})
export class AppModule {}
