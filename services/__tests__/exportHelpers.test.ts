import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportClientsToCSV, exportClientsToExcel } from '../exportHelpers';
import type { Client } from '../../types/users';

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    utilisateur: 1,
    email: 'a@b.c',
    nom: 'Nom',
    prenom: 'Prenom',
    fullName: 'Prenom Nom',
    actif: true,
    structure: null,
    structureId: null,
    nomStructure: 'Acme & Co',
    adresse: '1 rue <X>',
    telephone: '0600000000',
    contactPrincipal: 'Bob',
    emailFacturation: 'bill@acme.co',
    logo: null,
    ...overrides,
  };
}

describe('exportHelpers', () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let origAppend: typeof document.body.appendChild;
  let origRemove: typeof document.body.removeChild;
  let createdUrls: string[];
  let revokedUrls: string[];

  beforeEach(() => {
    createdUrls = [];
    revokedUrls = [];
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((_blob: Blob) => {
        const u = `blob:mock-${createdUrls.length}`;
        createdUrls.push(u);
        return u;
      }),
      revokeObjectURL: vi.fn((u: string) => {
        revokedUrls.push(u);
      }),
    });

    clickSpy = vi.fn();
    origAppend = document.body.appendChild.bind(document.body);
    origRemove = document.body.removeChild.bind(document.body);
    document.body.appendChild = vi.fn((node: Node) => {
      if (node instanceof HTMLAnchorElement) {
        node.click = clickSpy;
      }
      return origAppend(node);
    }) as typeof document.body.appendChild;
    document.body.removeChild = vi.fn((node: Node) =>
      origRemove(node),
    ) as typeof document.body.removeChild;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.appendChild = origAppend;
    document.body.removeChild = origRemove;
  });

  describe('exportClientsToCSV', () => {
    it('creates a blob URL and triggers a download click', () => {
      exportClientsToCSV([makeClient()]);
      expect(createdUrls).toHaveLength(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokedUrls).toHaveLength(1);
      expect(revokedUrls[0]).toBe(createdUrls[0]);
    });

    it('handles empty input gracefully', () => {
      expect(() => exportClientsToCSV([])).not.toThrow();
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('covers both actif=true and actif=false rows', () => {
      exportClientsToCSV([
        makeClient({ utilisateur: 1, actif: true }),
        makeClient({ utilisateur: 2, actif: false }),
      ]);
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('exportClientsToExcel', () => {
    beforeEach(() => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
        }),
      );
    });

    it('produces an xls download even when the logo fetch fails', async () => {
      await exportClientsToExcel([makeClient()]);
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('swallows fetch errors from the logo step', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')));
      await exportClientsToExcel([makeClient()]);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      errorSpy.mockRestore();
    });
  });
});
