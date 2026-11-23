import { resolve } from './routes';

/** path は base (/robrun-jp/) を除いた道 */
export default function App({ path }: { path: string }) {
  return resolve(path).element;
}
