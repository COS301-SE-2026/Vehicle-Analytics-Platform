import { useState } from 'react';
import { EMPTY_PARAMS, buildConditionParams as buildParams } from '@/components/alerts/ruleFormConstants';

export default function useRuleForm() {
  const [conditionType, setConditionType] = useState('speed_threshold');
  const [name, setName] = useState('');
  const [fleetGroupId, setFleetGroupId] = useState('');
  const [params, setParams] = useState(EMPTY_PARAMS.speed_threshold);
  const [error, setError] = useState('');

  function selectCondition(type, paramsForType) {
    setConditionType(type);
    setParams(paramsForType ?? EMPTY_PARAMS[type]);
    setError('');
  }

  function updateParam(key, value) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  function toggleFromList(key, value) {
    setParams((prev) => {
      const list = prev[key] || [];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...prev, [key]: next };
    });
  }

  function buildConditionParams() {
    return buildParams(conditionType, params);
  }

  function reset(next = {}) {
    setConditionType(next.conditionType ?? 'speed_threshold');
    setName(next.name ?? '');
    setFleetGroupId(next.fleetGroupId ?? '');
    setParams(next.params ?? EMPTY_PARAMS.speed_threshold);
    setError('');
  }

  return {
    conditionType,
    name,
    fleetGroupId,
    params,
    error,
    setName,
    setFleetGroupId,
    setError,
    selectCondition,
    updateParam,
    toggleFromList,
    buildConditionParams,
    reset,
  };
}