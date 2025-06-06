import { env } from 'bun';
import { AppError, ErrorCodes } from '@lib/errors';
import * as services from './services';
import * as webhooks from './webhooks';
import { init } from './init';
export class App {
    #routes;
    #webhooks;
    constructor() {
        init(env, [
            'POSTGRES_URL',
            'REDIS_URL',
            'TELEGRAM_BOT_TOKEN',
            'PUBLIC_ADMIN_TELEGRAM_ID',
            'PUBLIC_TELEGRAM_BOT_LINK',
            'DOMAIN'
        ]);
        this.#routes = {};
        this.#webhooks = {};
    }
    use = (service) => {
        Object.assign(this.#routes, service);
        return this;
    };
    bot = ({ onText }) => {
        Object.assign(this.#webhooks, onText);
        return this;
    };
    listen = (port = 3000) => {
        return Bun.serve({
            routes: {
                '/api/status': new Response('OK'),
                ...services.webhooks('/api/telegram/webhook', {
                    ...(this.#routes['/api/admin/signin'] ? webhooks.admin() : {}),
                    ...this.#webhooks,
                }),
                ...this.#routes,
            },
            error(bunError) {
                const error = bunError instanceof AppError
                    ? bunError
                    : new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, bunError?.toString() || JSON.stringify(bunError));
                return Response.json(error, {
                    status: error.status,
                });
            },
            port,
        });
    };
}
