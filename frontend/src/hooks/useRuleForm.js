import { useState } from 'react';
import { EMPTY_PARAMS } from './ruleFormConstants';

export default function useRuleForm() {
  const [conditionType, setConditionType] = useState('speed_threshold');
  const [name, setName] = useState('');
  const [fleetGroupId, setFleetGroupId] = useState('');
  const [params, setParams] = useState(EMPTY_PARAMS.speed_threshold);
  const [error, setError] = useState('');

  return {
    conditionType,
    name,
    fleetGroupId,
    params,
    error,
    setName,
    setFleetGroupId,
    setError,
  };
}