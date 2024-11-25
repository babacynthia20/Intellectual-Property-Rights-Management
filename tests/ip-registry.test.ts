import { describe, it, expect, beforeEach } from 'vitest';

// Mock blockchain state
let nextWorkId = 0;
const works = new Map<number, any>();
const workRoyalties = new Map<number, any>();

// Mock contract functions
const registerWork = (creator: string, title: string, description: string, rightsHolders: string[], royaltyShares: number[]) => {
  const workId = nextWorkId++;
  const totalRoyalty = royaltyShares.reduce((a, b) => a + b, 0);
  
  if (rightsHolders.length !== royaltyShares.length || totalRoyalty !== 100) {
    return { type: 'err', value: 401 }; // ERR-INVALID-ROYALTY
  }
  
  works.set(workId, {
    creator,
    title,
    description,
    creationDate: Date.now(),
    rightsHolders
  });
  
  workRoyalties.set(workId, {
    totalRoyalty,
    distributions: rightsHolders.map((holder, index) => ({ holder, share: royaltyShares[index] }))
  });
  
  return { type: 'ok', value: workId };
};

const getWork = (workId: number) => {
  const work = works.get(workId);
  return work ? { type: 'ok', value: work } : { type: 'err', value: 404 }; // ERR-NOT-FOUND
};

const getWorkRoyalties = (workId: number) => {
  const royalties = workRoyalties.get(workId);
  return royalties ? { type: 'ok', value: royalties } : { type: 'err', value: 404 }; // ERR-NOT-FOUND
};

const updateRoyalties = (sender: string, workId: number, newDistributions: { holder: string, share: number }[]) => {
  const work = works.get(workId);
  if (!work) return { type: 'err', value: 404 }; // ERR-NOT-FOUND
  if (work.creator !== sender) return { type: 'err', value: 403 }; // ERR-UNAUTHORIZED
  
  const totalRoyalty = newDistributions.reduce((sum, dist) => sum + dist.share, 0);
  if (totalRoyalty !== 100) return { type: 'err', value: 401 }; // ERR-INVALID-ROYALTY
  
  workRoyalties.set(workId, {
    totalRoyalty,
    distributions: newDistributions
  });
  
  return { type: 'ok', value: true };
};

describe('IP Registry Contract', () => {
  beforeEach(() => {
    nextWorkId = 0;
    works.clear();
    workRoyalties.clear();
  });
  
  it('should register a work successfully', () => {
    const result = registerWork(
        'creator1',
        'My Artwork',
        'A beautiful piece of art',
        ['creator1', 'rightsholder2', 'rightsholder3'],
        [50, 30, 20]
    );
    
    expect(result.type).toBe('ok');
    expect(result.value).toBe(0);
    
    const work = getWork(0);
    expect(work.type).toBe('ok');
    expect(work.value.title).toBe('My Artwork');
    
    const royalties = getWorkRoyalties(0);
    expect(royalties.type).toBe('ok');
    expect(royalties.value.totalRoyalty).toBe(100);
    expect(royalties.value.distributions).toHaveLength(3);
  });
  
  it('should fail to register a work with invalid royalties', () => {
    const result = registerWork(
        'creator1',
        'Invalid Work',
        'This should fail',
        ['creator1', 'rightsholder2'],
        [60, 50] // Sums to 110, which is invalid
    );
    
    expect(result.type).toBe('err');
    expect(result.value).toBe(401); // ERR-INVALID-ROYALTY
  });
  
  it('should update royalties successfully', () => {
    registerWork(
        'creator1',
        'My Artwork',
        'A beautiful piece of art',
        ['creator1', 'rightsholder2', 'rightsholder3'],
        [50, 30, 20]
    );
    
    const updateResult = updateRoyalties('creator1', 0, [
      { holder: 'creator1', share: 40 },
      { holder: 'rightsholder2', share: 40 },
      { holder: 'rightsholder3', share: 20 }
    ]);
    
    expect(updateResult.type).toBe('ok');
    
    const royalties = getWorkRoyalties(0);
    expect(royalties.type).toBe('ok');
    expect(royalties.value.distributions[0].share).toBe(40);
    expect(royalties.value.distributions[1].share).toBe(40);
  });
  
  it('should fail to update royalties for non-existent work', () => {
    const result = updateRoyalties('creator1', 999, [
      { holder: 'creator1', share: 100 }
    ]);
    
    expect(result.type).toBe('err');
    expect(result.value).toBe(404); // ERR-NOT-FOUND
  });
  
  it('should fail to update royalties by non-creator', () => {
    registerWork(
        'creator1',
        'My Artwork',
        'A beautiful piece of art',
        ['creator1', 'rightsholder2'],
        [60, 40]
    );
    
    const result = updateRoyalties('attacker', 0, [
      { holder: 'attacker', share: 100 }
    ]);
    
    expect(result.type).toBe('err');
    expect(result.value).toBe(403); // ERR-UNAUTHORIZED
  });
});
