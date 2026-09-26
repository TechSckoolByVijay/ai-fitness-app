import { ExportKindSchema, ExportQuerySchema } from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import { buildExport } from './export.service';

/**
 * A year of data is a few hundred small queries' worth of rows — cheap, but
 * not something a client should be able to loop on.
 */
const EXPORT_RATE_LIMIT = { max: 30, timeWindow: '1 hour' };

/**
 * GET /export/food.csv — one row per food item.
 * GET /export/days.csv — one row per day: calories vs target, protein vs
 * target, water, weight, sleep, steps.
 *
 * Both take ?days=N or ?from=YYYY-MM-DD[&to=YYYY-MM-DD], in the user's own
 * calendar. The data is the user's; handing it over in a format any tool
 * can read is the point.
 */
export async function exportRoutes(app: FastifyInstance) {
  for (const kind of ExportKindSchema.options) {
    app.get(
      `/export/${kind}.csv`,
      { preHandler: app.authenticate, config: { rateLimit: EXPORT_RATE_LIMIT } },
      async (request, reply) => {
        const query = ExportQuerySchema.parse(request.query);
        const file = await buildExport(app.prisma, request.user.sub, kind, query);
        reply
          .header('content-type', 'text/csv; charset=utf-8')
          .header('content-disposition', `attachment; filename="${file.filename}"`)
          .header('cache-control', 'no-store')
          .send(file.csv);
      },
    );
  }
}
