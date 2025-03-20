import React, { useState, useEffect } from 'react';
import TicketList from '../../components/Tickets/TicketList';
import TicketDetails from '../../components/Tickets/TicketDetails';
import { fetchSectors, fetchTicketsBySector } from '../../services/firebaseService';

const EnvoisPage: React.FC = () => {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [sectors, setSectors] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  useEffect(() => {
    const loadSectors = async () => {
      const sectorsData = await fetchSectors();
      setSectors(sectorsData);
    };
    loadSectors();
  }, []);

  useEffect(() => {
    if (selectedSector) {
      const loadTickets = async () => {
        const ticketsData = await fetchTicketsBySector(selectedSector);
        setTickets(ticketsData);
      };
      loadTickets();
    } else {
      setTickets([]);
    }
  }, [selectedSector]);

  const handleSectorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSector(event.target.value);
    setSelectedTicket(null);
  };

  const handleTicketSelect = (ticket: any) => {
    setSelectedTicket(ticket);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Gestion des Envois</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <div className="mb-4">
            <div className="form-control w-full max-w-xs">
              <label className="label">
                <span className="label-text">Secteur</span>
              </label>
              <select
                className="select select-bordered"
                value={selectedSector || ''}
                onChange={handleSectorChange}
              >
                <option disabled value="">Choisir le secteur</option>
                {sectors.map(sector => (
                  <option key={sector.id} value={sector.id}>{sector.id}</option>
                ))}
              </select>
            </div>
          </div>
          <TicketList tickets={tickets} onTicketSelect={handleTicketSelect} />
        </div>
        <div>
          <TicketDetails ticket={selectedTicket} />
        </div>
      </div>
    </div>
  );
};

export default EnvoisPage;
