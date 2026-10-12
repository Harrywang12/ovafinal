import Image from "next/image";

export function TrainingMasthead({ number, eyebrow, title, description, image }: { number: string; eyebrow: string; title: string; description: string; image: string }) {
  return <div className="training-masthead"><div className="training-masthead-copy"><p className="eyebrow"><span className="red-rule" />{eyebrow}</p><h1>{title}</h1><p>{description}</p></div><div className="training-masthead-image"><Image src={image} alt="" fill sizes="(min-width: 768px) 35vw, 100vw" /><span aria-hidden="true">{number}</span></div></div>;
}
