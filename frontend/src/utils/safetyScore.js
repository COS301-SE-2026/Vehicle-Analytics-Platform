//Singular source reference for safet score severity bands
//So that we make changes here only and those are universalS

export const SCORE_THRESHOLDS ={
    exemplary: 80,
    good: 60,
    needsAttention: 45,
}


export function getScoreSeverity(score){
    if (score == null){
        return {
            label: 'No Data',
            textClass: 'text-fleet-secondary',
            bgClass: 'bg-gray-100',
            barClass: 'bg-gray-300',
            ringColour: '#9CA3AF',
        }
    }

    if (score >= SCORE_THRESHOLDS.exemplary){
        return {
            label: 'Exemplary',
            textClass: 'text-fleet-green',
            bgClass: 'bg-green-50',
            barClass: 'bg-fleet-green',
            ringColour: '#16A34A',
        }
    }

    if (score >= SCORE_THRESHOLDS.good){
        return {
            label: 'Good',
            textClass: 'text-fleet-green',
            bgClass: 'bg-green-50',
            barClass: 'bg-fleet-green',
            ringColour: '#16A34A',
        }
    }

    if (score >= SCORE_THRESHOLDS.needsAttention){
        return {
            label: 'Needs Attention',
            textClass: 'text-amber-600',
            bgClass: 'bg-amber-50',
            barClass: 'bg-amber-500',
            ringColour: '#F59E0B',
        }
    }

    return {
            label: 'Critical Attention',
            textClass: 'text-fleet-alert',
            bgClass: 'bg-red-50',
            barClass: 'bg-fleet-alert',
            ringColour: '#DC2626',
        }
}