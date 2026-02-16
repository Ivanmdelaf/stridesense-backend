import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { SessionsModule } from './sessions/sessions.module';
import { RiskModule } from './risk/risk.module';

const dbEnabled = process.env.DB_ENABLED !== 'false';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ...(dbEnabled
      ? [
          TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              type: 'postgres' as const,
              host: config.get<string>('DB_HOST'),
              port: config.get<number>('DB_PORT'),
              username: config.get<string>('DB_USERNAME'),
              password: config.get<string>('DB_PASSWORD'),
              database: config.get<string>('DB_NAME'),
              autoLoadEntities: true,
              synchronize: true,
            }),
          }),
          AuthModule,
          SessionsModule,
          RiskModule,
        ]
      : []),
  ],
})
export class AppModule {}
