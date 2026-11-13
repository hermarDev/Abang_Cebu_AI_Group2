import { describe, expect, it } from "vitest";
import {
  inspectSupportMediaBytes,
  isValidSupportCategory,
  isValidSupportPriority,
  isValidSupportStatus,
  isValidUuid,
  sanitizeSupportFilename,
  validateSupportAttachmentFiles,
  validateSupportSubmission,
} from "./validation";

describe("Support validation helpers", () => {
  const validUuid = "12345678-1234-4234-8234-123456789abc";

  describe("UUID, Category, Status, Priority validators", () => {
    it("validates UUIDs properly", () => {
      expect(isValidUuid(validUuid)).toBe(true);
      expect(isValidUuid("not-a-uuid")).toBe(false);
      expect(isValidUuid(null)).toBe(false);
      expect(isValidUuid(undefined)).toBe(false);
      expect(isValidUuid(12345)).toBe(false);
    });

    it("validates categories", () => {
      expect(isValidSupportCategory("account_access")).toBe(true);
      expect(isValidSupportCategory("rental_search")).toBe(true);
      expect(isValidSupportCategory("other")).toBe(true);
      expect(isValidSupportCategory("unknown_category")).toBe(false);
      expect(isValidSupportCategory(null)).toBe(false);
    });

    it("validates statuses", () => {
      expect(isValidSupportStatus("open")).toBe(true);
      expect(isValidSupportStatus("in_progress")).toBe(true);
      expect(isValidSupportStatus("resolved")).toBe(true);
      expect(isValidSupportStatus("closed")).toBe(true);
      expect(isValidSupportStatus("pending")).toBe(false);
    });

    it("validates priorities", () => {
      expect(isValidSupportPriority("low")).toBe(true);
      expect(isValidSupportPriority("normal")).toBe(true);
      expect(isValidSupportPriority("high")).toBe(true);
      expect(isValidSupportPriority("urgent")).toBe(true);
      expect(isValidSupportPriority("critical")).toBe(false);
    });
  });

  describe("sanitizeSupportFilename", () => {
    it("strips path traversal and control characters", () => {
      expect(sanitizeSupportFilename("../../etc/passwd")).toBe("passwd");
      expect(sanitizeSupportFilename("C:\\Users\\admin\\document.pdf")).toBe("document.pdf");
      expect(sanitizeSupportFilename("hello\u0000world.png")).toBe("helloworld.png");
      expect(sanitizeSupportFilename("   photo.jpg   ")).toBe("photo.jpg");
      expect(sanitizeSupportFilename("")).toBe("attachment");
    });
  });

  describe("validateSupportSubmission", () => {
    const validPayload = {
      operationId: validUuid,
      requesterName: "Maria Santos",
      requesterEmail: "maria@example.com",
      category: "account_access",
      subject: "Cannot sign in to my account",
      description: "When I enter my email and password, the login button shows a loading spinner forever.",
      relatedListingId: null,
      turnstileToken: "dummy-token",
    };

    it("succeeds with valid payload", () => {
      const result = validateSupportSubmission(validPayload);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.requesterName).toBe("Maria Santos");
        expect(result.value.requesterEmail).toBe("maria@example.com");
        expect(result.value.category).toBe("account_access");
        expect(result.value.operationId).toBe(validUuid);
      }
    });

    it("accepts valid relatedListingId UUID", () => {
      const result = validateSupportSubmission({
        ...validPayload,
        relatedListingId: "22345678-1234-4234-8234-123456789abc",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.relatedListingId).toBe("22345678-1234-4234-8234-123456789abc");
      }
    });

    it("rejects invalid relatedListingId", () => {
      const result = validateSupportSubmission({
        ...validPayload,
        relatedListingId: "not-a-uuid",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.relatedListingId).toBeDefined();
      }
    });

    it("rejects short or empty name", () => {
      const result = validateSupportSubmission({ ...validPayload, requesterName: " " });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.requesterName).toBeDefined();
      }
    });

    it("rejects invalid email", () => {
      const result = validateSupportSubmission({ ...validPayload, requesterEmail: "not-an-email" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.requesterEmail).toBeDefined();
      }
    });

    it("rejects invalid category", () => {
      const result = validateSupportSubmission({ ...validPayload, category: "invalid" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.category).toBeDefined();
      }
    });

    it("rejects short subject", () => {
      const result = validateSupportSubmission({ ...validPayload, subject: "help" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.subject).toBeDefined();
      }
    });

    it("rejects short description", () => {
      const result = validateSupportSubmission({ ...validPayload, description: "too short" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.description).toBeDefined();
      }
    });
  });

  describe("validateSupportAttachmentFiles", () => {
    it("passes for valid file list", () => {
      const files = [
        { name: "photo1.png", type: "image/png", size: 1024 * 500 },
        { name: "doc.pdf", type: "application/pdf", size: 1024 * 1000 },
      ];
      expect(validateSupportAttachmentFiles(files)).toBeNull();
    });

    it("fails when more than 3 files attached", () => {
      const files = [
        { name: "1.png", type: "image/png", size: 100 },
        { name: "2.png", type: "image/png", size: 100 },
        { name: "3.png", type: "image/png", size: 100 },
        { name: "4.png", type: "image/png", size: 100 },
      ];
      expect(validateSupportAttachmentFiles(files)).toContain("Attach up to 3 files");
    });

    it("fails on unallowed MIME type", () => {
      const files = [{ name: "script.js", type: "application/javascript", size: 100 }];
      expect(validateSupportAttachmentFiles(files)).toContain("must be a JPG, PNG, WebP, or PDF file");
    });

    it("fails on oversized file", () => {
      const files = [{ name: "huge.pdf", type: "application/pdf", size: 6 * 1024 * 1024 }];
      expect(validateSupportAttachmentFiles(files)).toContain("must be 5 MB or smaller");
    });
  });

  describe("inspectSupportMediaBytes", () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const webpBytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    const invalidBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);

    it("validates PNG magic bytes", () => {
      expect(inspectSupportMediaBytes("image/png", pngBytes)).toBe("image/png");
      expect(inspectSupportMediaBytes("image/png", invalidBytes)).toBeNull();
    });

    it("validates JPEG magic bytes", () => {
      expect(inspectSupportMediaBytes("image/jpeg", jpegBytes)).toBe("image/jpeg");
      expect(inspectSupportMediaBytes("image/jpeg", invalidBytes)).toBeNull();
    });

    it("validates WebP magic bytes", () => {
      expect(inspectSupportMediaBytes("image/webp", webpBytes)).toBe("image/webp");
      expect(inspectSupportMediaBytes("image/webp", invalidBytes)).toBeNull();
    });

    it("validates PDF magic bytes", () => {
      expect(inspectSupportMediaBytes("application/pdf", pdfBytes)).toBe("application/pdf");
      expect(inspectSupportMediaBytes("application/pdf", invalidBytes)).toBeNull();
    });

    it("rejects mismatched mime type and bytes", () => {
      expect(inspectSupportMediaBytes("image/png", jpegBytes)).toBeNull();
    });
  });
});
