import Image from "next/image";

export default function Rules({withoutHeader}: {withoutHeader?: boolean}) {
    return (
        <>
            {!withoutHeader && <h4>Game Rules</h4>}
            <p>Two players play against each other making moves alternately. Making a move means selecting some connected unchecked checkboxes in a row and striking, i.e. checking, them. The selected checkboxes must not be interrupted by checkboxes that have already been checked, earlier.</p>
            <p>The player who is forced to check the last checkbox loses the game.</p>
            <h5>Example</h5>
            <Image src='/Checkboxing_Rules_Examples.png' alt='Example' width={320} height={600} />
        </>
    )
}