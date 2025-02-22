import {dirname} from 'node:path';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const testDownloadDir = path.join(__dirname, 'tempDownload');
export {testDownloadDir};
