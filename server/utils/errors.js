export class UnauthorizedError extends Error {
    constructor(message){
        super(message);
        this.status = 401;
    }
}

export class ValidationError extends Error {
    constructor(message){
        super(message);
        this.status = 400;
    }
}