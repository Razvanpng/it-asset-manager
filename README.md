# IT Asset Manager

Un REST API pentru gestionarea echipamentelor IT.
Permite sa tii evidenta echipamentelor, sa le aloci angajatilor, sa le muti intre locatii si sa generezi rapoarte.

## Ce am folosit

- Node.js 18 + TypeScript
- Express.js
- SQLite (better-sqlite3, nu necesita server separat)

## Cum rulezi proiectul

### 1. Ce ai nevoie instalat

- Node.js v18 (recomandat via nvm)
- npm

### 2. Instalare dependente

nvm use
cd api
npm install

### 3. Pornire server

cd api
npm run dev

Serverul porneste pe http://localhost:3000.
Baza de date SQLite se creeaza automat la prima pornire in /data/assets.db.

### 4. Populare cu date de test (optional)

cd api
npm run seed

### 5. Verificare ca merge

curl http://localhost:3000/health
# raspuns asteptat: { "status": "ok" }

## Endpoint-uri disponibile

### Angajati
| Metoda | URL                  | Ce face                    |
|--------|----------------------|----------------------------|
| GET    | /api/angajati        | returneaza toti angajatii  |
| GET    | /api/angajati/:id    | returneaza un angajat      |
| POST   | /api/angajati        | adauga angajat nou         |
| PUT    | /api/angajati/:id    | modifica angajat           |
| DELETE | /api/angajati/:id    | dezactiveaza angajat       |

### Echipamente
| Metoda | URL                     | Ce face                                          |
|--------|-------------------------|--------------------------------------------------|
| GET    | /api/echipamente        | lista echipamente (suporta filtrare, paginare, sortare) |
| GET    | /api/echipamente/:id    | returneaza un echipament                         |
| POST   | /api/echipamente        | adauga echipament nou                            |
| PUT    | /api/echipamente/:id    | modifica echipament                              |
| DELETE | /api/echipamente/:id    | sterge echipament                                |

### Componente
| Metoda | URL                              | Ce face                                  |
|--------|----------------------------------|------------------------------------------|
| GET    | /api/componente                  | lista componente                         |
| GET    | /api/componente/:id              | returneaza o componenta                  |
| POST   | /api/componente                  | adauga componenta si o asociaza la un echipament |
| PUT    | /api/componente/:id              | modifica componenta                      |
| DELETE | /api/componente/:id              | sterge componenta                        |
| PATCH  | /api/componente/:id/asociere     | muta componenta la alt echipament        |

### Operatiuni
| Metoda | URL                                    | Ce face                                              |
|--------|----------------------------------------|------------------------------------------------------|
| GET    | /api/operatiuni                        | lista operatiuni                                     |
| GET    | /api/operatiuni/:id                    | detalii operatiune                                   |
| POST   | /api/operatiuni/alocare                | aloca echipament la angajat (prima data)              |
| POST   | /api/operatiuni/mutare-angajat         | muta echipament de la un angajat la altul            |
| POST   | /api/operatiuni/returnare-magazie      | returneaza echipament la magazie                     |
| POST   | /api/operatiuni/alocare-din-magazie    | scoate echipament din magazie si il da unui angajat  |
| PATCH  | /api/operatiuni/:id/finalizare         | finalizeaza operatiunea si actualizeaza proprietarul |
| PATCH  | /api/operatiuni/:id/anulare            | anuleaza operatiunea                                 |

### QR
| Metoda | URL                              | Ce face                                        |
|--------|----------------------------------|------------------------------------------------|
| POST   | /api/qr/generare/:echipament_id  | genereaza cod QR pentru echipament             |
| POST   | /api/qr/regenerare/:echipament_id| genereaza QR nou si il invalideaza pe cel vechi|
| GET    | /api/qr/rezolvare/:token         | scanare QR, returneaza datele echipamentului   |

### Casare
| Metoda | URL                          | Ce face                                       |
|--------|------------------------------|-----------------------------------------------|
| POST   | /api/casare/:echipament_id   | caseaza echipamentul (blocat daca sub 5 ani)  |

### Rapoarte
| Metoda | URL                                    | Ce face                                        |
|--------|----------------------------------------|------------------------------------------------|
| GET    | /api/rapoarte/inventar-angajat         | ce echipamente are fiecare angajat             |
| GET    | /api/rapoarte/inventar-magazie         | ce echipamente sunt in fiecare magazie         |
| GET    | /api/rapoarte/istoric/:echipament_id   | toate miscarile unui echipament                |
| GET    | /api/rapoarte/eligibile-casare         | echipamente cu vechime de peste 5 ani          |
| GET    | /api/rapoarte/operatiuni-in-curs       | operatiuni care nu sunt inca finalizate        |

## Reguli importante

1. Serialul unui echipament este unic, nu pot exista doua cu acelasi serial.
2. Un echipament nu poate avea doua operatiuni active in acelasi timp.
3. Echipamentele cu status defect sau in_service nu pot fi mutate sau alocate.
4. Cand se initiaza o mutare, statusul echipamentului devine in_curs_de_transfer.
5. Proprietarul sau locatia se actualizeaza doar la finalizarea operatiunii, nu la initiere.
6. Toate miscarile sunt salvate in istoric, nu se sterg.
7. Cand se regenereaza un QR, cel vechi devine invalid automat.
8. Un echipament poate fi fie la un angajat, fie intr-o magazie, nu in ambele locuri.
9. Casarea unui echipament este blocata daca acesta are mai putin de 5 ani de la achizitie.

## Testare cu Postman

In folderul /postman se gasesc doua fisiere:
- collection.json — contine un scenariu E2E complet cu toate operatiunile in ordine
- environment.json — variabile de environment (URL, id-uri salvate dinamic intre requesturi)

Importa ambele fisiere in Postman si ruleaza colectia in ordinea din folderul E2E Scenario.