import assert from 'node:assert/strict';
import test from 'node:test';

import { cancelContractForNextWave } from '../src/contractLifecycle.js';

test('cancelling a contract refunds it without removing its fielded unit', () => {
  const contracts = [
    { id: 'player-1', type: 'melee' },
    { id: 'player-2', type: 'ranged' }
  ];
  const fieldedUnit = {
    team: 'player',
    spawnerId: 'player-1',
    type: 'melee',
    isAlive: true
  };
  const economy = { minerals: 10 };
  const waveSystem = {
    removeSpawner(team, type) {
      const index = contracts.findIndex(contract => contract.type === type);
      return index >= 0 ? contracts.splice(index, 1)[0] : null;
    }
  };

  const result = cancelContractForNextWave({
    waveSystem,
    entityManager: { entities: [fieldedUnit] },
    economy,
    team: 'player',
    type: 'melee',
    unitCost: 50
  });

  assert.equal(result.removed.id, 'player-1');
  assert.equal(result.refundAmount, 25);
  assert.equal(economy.minerals, 35);
  assert.deepEqual(contracts, [{ id: 'player-2', type: 'ranged' }]);
  assert.deepEqual(result.fieldedUnits, [fieldedUnit]);
  assert.equal(fieldedUnit.isAlive, true);
});
