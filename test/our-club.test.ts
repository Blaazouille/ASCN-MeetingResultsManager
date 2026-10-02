/**
 * Responsabilité : vérifie la reconnaissance de « Notre club » (issue #26) : correspondance exacte hors casse et espaces,
 * choix proposés dans Paramètres, alerte après un import qui ne contient pas notre club.
 * Appelé par : Vitest.
 * Suppression casserait : le garde-fou contre la mise en avant du mauvais club ou sa disparition silencieuse.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_OUR_CLUB, isOurClub, ourClubChoices, ourClubMissingNotice, tidyClubName } from '../src/lib/our-club';

describe('DEFAULT_OUR_CLUB', () => {
  it('is AS Cherbourg Natation, so nothing changes until someone picks another club', () => {
    expect(DEFAULT_OUR_CLUB).toBe('AS CHERBOURG NATATION');
  });
});

describe('isOurClub', () => {
  it('matches the exact FFN label', () => {
    expect(isOurClub('AS CHERBOURG NATATION', 'AS CHERBOURG NATATION')).toBe(true);
  });

  it('ignores case and extra spaces', () => {
    expect(isOurClub('AS CHERBOURG NATATION', '  as  Cherbourg natation ')).toBe(true);
    expect(isOurClub('CN VIRY-CHÂTILLON', 'cn viry-châtillon')).toBe(true);
  });

  it('never matches another club with a similar name', () => {
    expect(isOurClub('AC CHERBOURG EN COTENTIN', 'AS CHERBOURG NATATION')).toBe(false);
    expect(isOurClub('AS CHERBOURG NATATION 2', 'AS CHERBOURG NATATION')).toBe(false);
    expect(isOurClub('AS CHERBOURG', 'AS CHERBOURG NATATION')).toBe(false);
  });

  it('keeps accents significant', () => {
    expect(isOurClub('CN VIRY-CHATILLON', 'CN VIRY-CHÂTILLON')).toBe(false);
  });

  it('follows the configured club rather than AS Cherbourg Natation', () => {
    expect(isOurClub('AS CHERBOURG NATATION', 'EN CAEN')).toBe(false);
    expect(isOurClub('EN CAEN', 'EN CAEN')).toBe(true);
  });
});

describe('tidyClubName', () => {
  it('removes leading, trailing and doubled spaces but keeps the case', () => {
    expect(tidyClubName('  En   Caen ')).toBe('En Caen');
  });
});

describe('ourClubChoices', () => {
  const clubs = ['EN CAEN', 'AS CHERBOURG NATATION', 'AC CHERBOURG EN COTENTIN', 'EN CAEN'];

  it('lists each club of the meeting once, alphabetically, with ours preselected', () => {
    expect(ourClubChoices(clubs, 'AS CHERBOURG NATATION')).toEqual({
      clubs: ['AC CHERBOURG EN COTENTIN', 'AS CHERBOURG NATATION', 'EN CAEN'],
      selected: 'AS CHERBOURG NATATION',
      missing: false,
    });
  });

  it("preselects the meeting's own spelling when the setting differs only by case or spaces", () => {
    expect(ourClubChoices(clubs, 'en  caen')).toMatchObject({ selected: 'EN CAEN', missing: false });
  });

  it('keeps a club absent from the meeting at the top of the list, flagged as missing', () => {
    expect(ourClubChoices(clubs, 'CN VIRY-CHÂTILLON')).toEqual({
      clubs: ['CN VIRY-CHÂTILLON', 'AC CHERBOURG EN COTENTIN', 'AS CHERBOURG NATATION', 'EN CAEN'],
      selected: 'CN VIRY-CHÂTILLON',
      missing: true,
    });
  });
});

describe('ourClubMissingNotice', () => {
  const rows = [{ club: 'EN CAEN' }, { club: 'AC CHERBOURG EN COTENTIN' }];

  it('says nothing when the file contains our club', () => {
    expect(ourClubMissingNotice(rows, 'en caen')).toBeNull();
  });

  it('names the configured club and points to Paramètres when the file lacks it', () => {
    expect(ourClubMissingNotice(rows, 'AS CHERBOURG NATATION')).toBe(
      "Notre club (AS CHERBOURG NATATION) n'apparaît pas dans ce fichier — vérifiez le réglage dans Paramètres."
    );
  });
});
