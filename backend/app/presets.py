from app.models import BattlefieldMap, Edge, Node, TerrainType


def demo_battlefield() -> BattlefieldMap:
    return BattlefieldMap(
        nodes=[
            Node(id="HQ", x=80, y=320, threat=0.0, civilian_risk=0.1, terrain=TerrainType.OPEN),
            Node(id="A1", x=200, y=280, threat=0.2, civilian_risk=0.3, terrain=TerrainType.OPEN),
            Node(id="A2", x=320, y=200, threat=0.5, civilian_risk=0.2, terrain=TerrainType.ROUGH),
            Node(id="B1", x=180, y=160, threat=0.7, civilian_risk=0.8, terrain=TerrainType.URBAN),
            Node(id="B2", x=360, y=120, threat=0.9, civilian_risk=0.4, terrain=TerrainType.URBAN),
            Node(id="C1", x=480, y=240, threat=0.3, civilian_risk=0.1, terrain=TerrainType.OPEN),
            Node(id="C2", x=560, y=160, threat=0.4, civilian_risk=0.2, terrain=TerrainType.ROUGH),
            Node(id="OBJ", x=640, y=280, threat=0.1, civilian_risk=0.15, terrain=TerrainType.OPEN),
            Node(id="W1", x=400, y=360, threat=0.2, civilian_risk=0.05, terrain=TerrainType.WATER),
            Node(id="S1", x=260, y=380, threat=0.15, civilian_risk=0.6, terrain=TerrainType.OPEN),
        ],
        edges=[
            Edge(source="HQ", target="A1"),
            Edge(source="HQ", target="S1"),
            Edge(source="A1", target="A2"),
            Edge(source="A1", target="B1"),
            Edge(source="A1", target="S1"),
            Edge(source="A2", target="B2"),
            Edge(source="A2", target="C1"),
            Edge(source="B1", target="B2"),
            Edge(source="B1", target="S1"),
            Edge(source="B2", target="C2"),
            Edge(source="C1", target="C2"),
            Edge(source="C1", target="OBJ"),
            Edge(source="C2", target="OBJ"),
            Edge(source="W1", target="S1"),
            Edge(source="W1", target="C1"),
            Edge(source="S1", target="W1"),
            Edge(source="A2", target="W1"),
        ],
    )
