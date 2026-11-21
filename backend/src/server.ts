import app from './app';
import { solutionsIndexService } from './services/solutions-finder';
import { bootstrapPages } from './services/bootstrap-pages';

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    const result = await bootstrapPages();
    console.log(`✓ Bootstrapped pages: ${result.created.length} created, ${result.updated.length} updated`);
  } catch (err) {
    console.error('Failed to bootstrap pages on boot:', err);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`SchoolMart Backend running on port ${PORT}`);
    solutionsIndexService.rebuild().then(() => {
      solutionsIndexService.startNightlySync(3, 0);
      console.log(`✓ Solutions Index initialized (${solutionsIndexService.getCards().length} cards, v:${solutionsIndexService.getVersion()})`);
    }).catch((err: any) => {
      console.error('Failed to initialize solutions index on boot:', err);
    });
  });
}

startServer();
