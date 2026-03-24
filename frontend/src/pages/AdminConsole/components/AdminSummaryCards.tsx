type SummaryCard = {
  title: string;
  value: string;
  detail: string;
  dirty: boolean;
  onClick: () => void;
};

const AdminSummaryCards = ({ cards }: { cards: SummaryCard[] }) => (
  <div className="admin-mini-card-grid">
    {cards.map((card) => (
      <button key={card.title} type="button" className="admin-mini-card" onClick={card.onClick}>
        <div className="admin-mini-card-head">
          <h4>{card.title}</h4>
          {card.dirty && <span className="admin-dirty-pill">Unsaved</span>}
        </div>
        <strong>{card.value}</strong>
        <p>{card.detail}</p>
      </button>
    ))}
  </div>
);

export default AdminSummaryCards;
