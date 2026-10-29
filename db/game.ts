import {env} from 'cloudflare:workers';
export function gameDb(): D1Database {const db=(env as unknown as {DB:D1Database}).DB;if(!db)throw Error('DB unavailable');return db}
