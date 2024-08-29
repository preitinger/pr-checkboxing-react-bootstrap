import Image from "next/image"
import { PropsWithChildren } from "react"
import styles from './ImgAttributions.module.css'
import Table from "react-bootstrap/Table";

function ImgAndAttrRow({ url, children }: PropsWithChildren<{ url: string }>) {
    return (
        <tr>
            <td><Image src={url} alt={url} width={64} height={64} /></td>
            <td>{children}</td>
        </tr>
    )
}

export interface ImgAttribution {
    imgUrl: string;
    attribution: React.ReactNode;
}

export default function ImgAttributions({ attributions }: { attributions: ImgAttribution[] }) {
    return (
        <>
            <h3 className='mb-4'>Vielen Dank für folgende kostenlose Bilder bereit gestellt unter freepik.com:</h3>
            <Table>
                <tbody>
                    {
                        attributions.map(({ imgUrl, attribution }) => (<ImgAndAttrRow key={imgUrl} url={imgUrl}>{attribution}</ImgAndAttrRow>))
                    }

                </tbody>
            </Table>
        </>
    )
}