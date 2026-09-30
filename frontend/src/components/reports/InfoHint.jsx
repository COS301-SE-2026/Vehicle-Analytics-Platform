import PropTypes from 'prop-types'
import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

export default function InfoHint({ label, children }) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-label={`How to read: ${label}`}
					className="inline-flex shrink-0 items-center justify-center rounded-full p-0.5
						text-fleet-secondary hover:text-fleet-blue
						focus-visible:outline focus-visible:outline-2 focus-visible:outline-fleet-blue"
				>
					<Info className="w-4 h-4" aria-hidden="true" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				side="bottom"
				align="start"
				collisionPadding={16}
				className="z-50 w-96 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto space-y-2 rounded-xl
					border border-fleet-border bg-white p-4 text-xs leading-relaxed text-fleet-text shadow-lg"
			>
				{children}
			</PopoverContent>
		</Popover>
	)
}

InfoHint.propTypes = {
	label: PropTypes.string.isRequired,
	children: PropTypes.node.isRequired,
}

/** Divider plus heading that starts the calculation part of a hint. */
export function HowCalculated({ children }) {
	return (
		<div className="mt-3 space-y-2.5 border-t border-fleet-border pt-3">
			<p className="font-semibold">How it&apos;s calculated</p>
			{children}
		</div>
	)
}

HowCalculated.propTypes = { children: PropTypes.node.isRequired }

export function Formula({ label, children, note }) {
	return (
		<div>
			<p className="text-fleet-secondary">{label}</p>
			<p className="mt-0.5 rounded-md bg-gray-50 px-2 py-1 font-medium">{children}</p>
			{note && <p className="mt-1 text-fleet-secondary">{note}</p>}
		</div>
	)
}

Formula.propTypes = {
	label: PropTypes.string.isRequired,
	children: PropTypes.node.isRequired,
	note: PropTypes.node,
}