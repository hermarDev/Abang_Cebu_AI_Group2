import { BrowserDraftIntentRepository } from "../../src/app/list-property/draft-retry-store";
import { releaseDraftUpload, restartReleasedDraftUpload } from "../../src/app/list-property/draft-save-client";
Object.assign(window, { BrowserDraftIntentRepository, releaseDraftUpload, restartReleasedDraftUpload });
