import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type HealthStatus = {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
};

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  async check(): Promise<HealthStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', database: 'up' };
    } catch {
      return { status: 'degraded', database: 'down' };
    }
  }
}
