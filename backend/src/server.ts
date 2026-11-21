import app from './app';
import { solutionsIndexService } from './services/solutions-finder';

const PORT = process.env.PORT || 3001;

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`SchoolMart Backend running on port ${PORT}`);
  solutionsIndexService.rebuild().then(() => {
    solutionsIndexService.startNightlySync(3, 0);
    console.log(`✓ Solutions Index initialized (${solutionsIndexService.getCards().length} cards, v:${solutionsIndexService.getVersion()})`);
  }).catch((err: any) => {
    console.error('Failed to initialize solutions index on boot:', err);
  });
});
