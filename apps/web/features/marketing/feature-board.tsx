import Link from "next/link"
import { features } from "./content"
import { featureScenes, Scene } from "./illustrations"

const colors = ["blue", "yellow", "pink", "lilac", "peach", "mint"]

export function FeatureBoard() {
  return (
    <ul className="notebook-feature-grid">
      {features.map((feature, index) => (
        <li key={feature.title} className="notebook-feature-card">
          <div
            className={`notebook-feature-picture notebook-feature-${colors[index % colors.length]}`}
          >
            <Scene>{featureScenes[index]}</Scene>
          </div>
          <div className="notebook-feature-caption">
            <h3 className="notebook-title">{feature.title}</h3>
            <p>{feature.text}</p>
            {index === 0 && (
              <Link href="/agents" className="notebook-link">
                Explore agent integrations
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
