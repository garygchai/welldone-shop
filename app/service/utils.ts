import { Service } from 'egg';

export default class Utils extends Service {
  public sleep(time: number) {
    console.log(12312323, time)
    return new Promise(resolve => setTimeout(resolve, time))
  }
}
