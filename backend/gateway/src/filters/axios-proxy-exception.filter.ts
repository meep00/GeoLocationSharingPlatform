import { AxiosError } from 'axios';
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(AxiosError)
export class AxiosProxyExceptionFilter implements ExceptionFilter {
  catch(exception: AxiosError, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const upstreamStatus = exception.response?.status;
    const status = upstreamStatus ?? HttpStatus.BAD_GATEWAY;
    const upstreamBody = exception.response?.data;

    if (upstreamBody !== undefined) {
      response.status(status).json(upstreamBody);
      return;
    }

    response.status(status).json({
      statusCode: status,
      message: exception.message || 'Upstream request failed',
      path: request.url,
      timestamp: new Date().toISOString()
    });
  }
}
