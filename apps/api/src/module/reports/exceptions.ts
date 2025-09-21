// apps/api/src/module/exceptions.ts

export class HttpException extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class ForbiddenException extends HttpException {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class BadRequestException extends HttpException {
  constructor(message = 'Bad request') {
    super(message, 400);
  }
}
