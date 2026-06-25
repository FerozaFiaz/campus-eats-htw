import { Canteen } from "@/types/canteen";

interface CanteenImage {
    backgroundColor: string;
    uri: string;
}

const IMAGE_VARIANTS: CanteenImage[] = [
    {
        backgroundColor: "#CFE8DD",
        uri: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=240&q=80"
    },
    {
        backgroundColor: "#D8E7F2",
        uri: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=240&q=80"
    },
    {
        backgroundColor: "#E7D9C5",
        uri: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=240&q=80"
    },
    {
        backgroundColor: "#D9E4CF",
        uri: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=240&q=80"
    },
    {
        backgroundColor: "#C9D8E6",
        uri: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=240&q=80"
    },
    {
        backgroundColor: "#E1D6C8",
        uri: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=240&q=80"
    }
];

const NAMED_IMAGES: Array<{ match: RegExp; image: CanteenImage }> = [
    {
        match: /charit|zahnklinik|virchow|medizin/i,
        image: {
            backgroundColor: "#D8E7F2",
            uri: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=240&q=80"
        }
    },
    {
        match: /htw|wilhelminenhof|treskowallee/i,
        image: {
            backgroundColor: "#CFE8DD",
            uri: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=240&q=80"
        }
    },
    {
        match: /tu |technische|hardenberg|bht|luxemburger|beuth/i,
        image: {
            backgroundColor: "#C9D8E6",
            uri: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=240&q=80"
        }
    },
    {
        match: /fu |freien|dahlem|silberlaube|lankwitz/i,
        image: {
            backgroundColor: "#D9E4CF",
            uri: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=240&q=80"
        }
    },
    {
        match: /hu |humboldt|nord|adlershof/i,
        image: {
            backgroundColor: "#E1D6C8",
            uri: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=240&q=80"
        }
    },
    {
        match: /ash|alice salomon|ehb|teltower/i,
        image: {
            backgroundColor: "#E7D9C5",
            uri: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=240&q=80"
        }
    }
];

function hashText(text: string): number {
    return text.split("").reduce((hash, character) => hash + character.charCodeAt(0), 0);
}

export function getCanteenImage(canteen: Canteen): CanteenImage {
    const searchableText = `${canteen.name} ${canteen.district ?? ""} ${canteen.universities.join(" ")}`;
    const namedImage = NAMED_IMAGES.find(({ match }) => match.test(searchableText));

    if (namedImage) {
        return namedImage.image;
    }

    return IMAGE_VARIANTS[hashText(searchableText) % IMAGE_VARIANTS.length];
}