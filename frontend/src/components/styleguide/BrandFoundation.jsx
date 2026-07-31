export default function BrandFoundation(){
    return (
    <div>
        <h2 className="font-display font-bold text-2xl text-fleet-text mb-2">
            The Brand Foundation
        </h2>

        <p className="text-fleet-secondary mb-8">
            Why does V.A.P.O.R. even exist? What does it believe? How does it sound, always? How does it sound, situationally?
        </p>

        {/*PURPOSE*/}
        <div className="mb-8">
            <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Purpose</h3>
            <p className="text-fleet-text font-display font-semibold text-xl mb-2">
                V.A.P.O.R. exists to catch dangerous driving while there's still time to prevent it.
            </p>
            <p className="text-fleet-text">
                Most fleet systems exist just to tell you where a vehicle is. We tell you whether something needs to change before it becomes an incident.
            </p>
        </div>

        {/*VALUES*/}
        <div className="mb-8">
            <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Values</h3>
            <p className="text-fleet-text">
                <strong>A number on screen needs to be trustworthy.</strong>
                If we show a safety score or a status, it needs to reflect what really is happening. If we do not have enough information to say something confidently, the V.A.P.O.R. interface shall admit to that rather than filling the gap with a number that looks fine but isn't backed by anything.
            </p>
            <p>

            </p>
            <p className="text-fleet-text">
                <strong>Colour has to mean something or it shouldn't be used.</strong>
                It is easy to let colour become decoration. We stand for using colour as a signal that speaks when something is safe or needs attention. We remain consistent in this across the system.
            </p>
            <p className="text-fleet-text">
                <strong>Bad news should be as visible as good news.</strong>
                A problem that is hidden behind a vague label, a spinner that never resolves, or buried where a busy person won't find it is a problem that doesn't get fixed. We understand and stand against hiding issues as it makes the interface feel calmer but in turn works against the entire reason this platform exists.
            </p>
            <p className="text-fleet-text">
                <strong>The interface has to work for someone who only has a few seconds</strong>
                We understand that fleet managers are glancing at the analytics between other tasks, not sitting down to study it. Therefore the meaning of something we display on screen needs to be obvious enough on its own.
            </p>
        </div>

        {/*VOICE*/}
        <div className="mb-8">
            <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Voice</h3>
            <p className="text-fleet-text">
                We relate our system to a competent radio dispatcher rather than a consumer app trying to be exciting. Think how a dispatcher states what happened plainly and trusts the listener to know what to do with it. There is no exaggeration or forced enthusiasm or softening bad news into something vaguer than it is. This is our exact model. Direct, calm, and respectful of the fact that real decisions about real people are being made based on what this product is saying.
            </p>
        </div>

        {/*TONE*/}
        <div className="mb-8">
            <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Tone</h3>
            <p className="text-fleet-text mb-4">
                Voice stays constant. Tone is how that same voice adjusts to the situation. Our competent radio dispatcher now does not become a different person during an emergency, they just get more direct.
            </p>
            <table className="w-full text-sm border border-fleet-border rounded-lg overflow-hidden">
                <thead className="bg-fleet-panel">
                    <tr>
                        <th className="text-left p-2">Situation</th>
                        <th className="text-left p-2">Tone</th>
                        <th className="text-left p-2">Example</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-t border-fleet-border">
                        <td className="p-2">Critical Safety Event</td>
                        <td className="p-2">Direct, urgent, no exaggeration</td>
                        <td className="p-2"> e.g. "Harsh braking detected"</td>
                    </tr>
                    <tr className="border-t border-fleet-border">
                        <td className="p-2">Routine status</td>
                        <td className="p-2">Plain, numbers-first</td>
                        <td className="p-2">e.g. "15 active, 0 offline"</td>
                    </tr>
                    <tr className="border-t border-fleet-border">
                        <td className="p-2">Something failed</td>
                        <td className="p-2">Honest, no blame, give the next step</td>
                        <td className="p-2">e.g. "Couldn't load vehicles. Try again"</td>
                    </tr>
                    <tr className="border-t border-fleet-border">
                        <td className="p-2">No data yet</td>
                        <td className="p-2">Sets expectation</td>
                        <td className="p-2">e.g. "Nothing to show yet"</td>
                    </tr>
                    <tr className="border-t border-fleet-border">
                        <td className="p-2">Confirmation</td>
                        <td className="p-2">Understated, not celebratory</td>
                        <td className="p-2">e.g. "Saved"</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    )
}