import { ClassifierService } from "./classifier.service";

/**
 * ClassifierModule
 * ----------------
 * Exports a singleton classifier service that can be plugged into apps/api.
 */
export class ClassifierModule {
  private static instance: ClassifierService;

  static getService(): ClassifierService {
    if (!ClassifierModule.instance) {
      ClassifierModule.instance = new ClassifierService();
    }
    return ClassifierModule.instance;
  }
}
