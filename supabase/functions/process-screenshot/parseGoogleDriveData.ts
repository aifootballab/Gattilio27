// Helper per parsare dati da Google Drive (formato reale)
// Converte struttura dati Google Drive in formato database

export interface GoogleDrivePlayerData {
  "Giocatori": string  // "98\nESA\nVinícius Júnior\nESA Ala prolifica"
  "Complessivamente": string
  "Potenziale": string
  "Costo": string
  "Livello Massimo": string
  "Condizione": string
  "ClubName": string
  "Nazionalità...": string
  "Altezza": string
  "Peso": string
  "Età": string
  "Comportamento offensivo": string
  "Controllo palla": string
  "Vel. dribbling": string
  "Possesso stretto": string
  "Passaggio rasoterra": string
  "Passaggio alto": string
  "Finalizzazione": string
  "Colpo di testa": string
  "Calci piazzati": string
  "Tiro a giro": string
  "Velocità": string
  "Accelerazione": string
  "Potenza di tiro": string
  "Elevazione": string
  "Contatto fisico": string
  "Equilibrio": string
  "Resistenza": string
  "Comportamento difensivo": string
  "Coinvolgimento difensivo": string
  "Contrasto": string
  "Aggressività": string
  "Portieri": string
  "Presa PT": string
  "Parata PT": string
  "Riflessi PT": string
  "Estensione PT": string
  [key: string]: string
}

export interface ParsedPlayerData {
  // Campi diretti
  player_name: string
  position: string
  role: string
  overall_rating: number
  
  // Dati anagrafici
  height: number | null
  weight: number | null
  age: number | null
  nationality: string | null
  club_name: string | null
  
  // Dati gioco
  potential_max: number | null
  cost: number | null
  form: string | null
  level_cap: number | null
  
  // Statistiche
  base_stats: {
    overall_rating: number
    attacking: {
      offensive_awareness: number | null
      ball_control: number | null
      dribbling: number | null
      tight_possession: number | null
      low_pass: number | null
      lofted_pass: number | null
      finishing: number | null
      heading: number | null
      place_kicking: number | null
      curl: number | null
    }
    defending: {
      defensive_awareness: number | null
      defensive_engagement: number | null
      tackling: number | null
      aggression: number | null
      goalkeeping: number | null
      gk_catching: number | null
      gk_parrying: number | null
      gk_reflexes: number | null
      gk_reach: number | null
    }
    athleticism: {
      speed: number | null
      acceleration: number | null
      kicking_power: number | null
      jump: number | null
      physical_contact: number | null
      balance: number | null
      stamina: number | null
    }
  }
}

/**
 * Parse dati da Google Drive in formato database
 */
export function parseGoogleDriveData(data: GoogleDrivePlayerData): ParsedPlayerData {
  // Parse campo "Giocatori": "98\nESA\nVinícius Júnior\nESA Ala prolifica"
  const giocatoriParts = data["Giocatori"]?.split("\n") || []
  const overallRating = parseInt(giocatoriParts[0]) || parseInt(data["Complessivamente"]) || 0
  const position = giocatoriParts[1] || ""
  const playerName = giocatoriParts[2] || "Unknown Player"
  const role = giocatoriParts[3] || ""

  // Helper per parse numero (gestisce stringhe vuote)
  const parseIntSafe = (value: string | undefined): number | null => {
    if (!value || value.trim() === "") return null
    const parsed = parseInt(value)
    return isNaN(parsed) ? null : parsed
  }

  // Helper per parse stringa (gestisce stringhe vuote)
  const parseStringSafe = (value: string | undefined): string | null => {
    if (!value || value.trim() === "") return null
    return value.trim()
  }

  return {
    // Campi diretti
    player_name: playerName,
    position: position,
    role: role,
    overall_rating: overallRating,
    
    // Dati anagrafici
    height: parseIntSafe(data["Altezza"]),
    weight: parseIntSafe(data["Peso"]),
    age: parseIntSafe(data["Età"]),
    nationality: parseStringSafe(data["Nazionalità..."]),
    club_name: parseStringSafe(data["ClubName"]),
    
    // Dati gioco
    potential_max: parseIntSafe(data["Potenziale"]),
    cost: parseIntSafe(data["Costo"]),
    form: parseStringSafe(data["Condizione"]),
    level_cap: parseIntSafe(data["Livello Massimo"]),
    
    // Statistiche
    base_stats: {
      overall_rating: overallRating,
      attacking: {
        offensive_awareness: parseIntSafe(data["Comportamento offensivo"]),
        ball_control: parseIntSafe(data["Controllo palla"]),
        dribbling: parseIntSafe(data["Vel. dribbling"]),
        tight_possession: parseIntSafe(data["Possesso stretto"]),
        low_pass: parseIntSafe(data["Passaggio rasoterra"]),
        lofted_pass: parseIntSafe(data["Passaggio alto"]),
        finishing: parseIntSafe(data["Finalizzazione"]),
        heading: parseIntSafe(data["Colpo di testa"]),
        place_kicking: parseIntSafe(data["Calci piazzati"]),
        curl: parseIntSafe(data["Tiro a giro"])
      },
      defending: {
        defensive_awareness: parseIntSafe(data["Comportamento difensivo"]),
        defensive_engagement: parseIntSafe(data["Coinvolgimento difensivo"]),
        tackling: parseIntSafe(data["Contrasto"]),
        aggression: parseIntSafe(data["Aggressività"]),
        goalkeeping: parseIntSafe(data["Portieri"]),
        gk_catching: parseIntSafe(data["Presa PT"]),
        gk_parrying: parseIntSafe(data["Parata PT"]),
        gk_reflexes: parseIntSafe(data["Riflessi PT"]),
        gk_reach: parseIntSafe(data["Estensione PT"])
      },
      athleticism: {
        speed: parseIntSafe(data["Velocità"]),
        acceleration: parseIntSafe(data["Accelerazione"]),
        kicking_power: parseIntSafe(data["Potenza di tiro"]),
        jump: parseIntSafe(data["Elevazione"]),
        physical_contact: parseIntSafe(data["Contatto fisico"]),
        balance: parseIntSafe(data["Equilibrio"]),
        stamina: parseIntSafe(data["Resistenza"])
      }
    }
  }
}
