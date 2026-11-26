# Socle d'hébergement et niveaux de service

**Statut** : **accepté** sur le principe — les prix, le RTO/RPO et l'astreinte restent à arrêter, et relèvent du commerce
**Date** : 2026-09-18
**Portée** : fixe le socle par défaut d'un nouveau projet. Ne convertit aucun projet existant.

## Context and Problem Statement

L'agence héberge ses applications sur des serveurs physiques loués chez OVHcloud, à l'exception d'un projet migré vers des instances Public Cloud. Le physique a été retenu historiquement parce qu'il est moins cher et plus performant à ressource égale — ce qui reste vrai au tarif catalogue.

Deux constats le mettent en question :

- **Le patch management est rarement fait.** Sur une machine physique, chaque mise à jour d'un système en production est un pari sans retour arrière rapide : il n'y a ni instantané ni clone jetable, seulement une restauration de sauvegarde.
- **Le multi-AZ n'existe pas en physique.** Ni chez OVHcloud ni chez Scaleway le bare metal n'est éligible aux régions multi-AZ. Ce n'est pas une particularité d'un fournisseur : **choisir le physique, c'est choisir le mono-AZ**, et donc accepter qu'une défaillance de datacenter interrompe le service.

L'infrastructure et son exploitation sont facturées au client, et tous les clients n'ont pas la même exigence de disponibilité.

**Faut-il un socle d'hébergement unique pour toute l'agence, ou plusieurs niveaux choisis et payés selon l'exigence du client ?**

## Decision Drivers

- **Le coût** — le physique est moins cher à ressource nominale égale ; l'écart doit être payé par quelque chose.
- **La maintenance** — la réversibilité du patching conditionne qu'il soit fait.
- **La disponibilité** — le mono-AZ est un plafond structurel, pas un réglage.
- **La performance** — des cœurs physiques dédiés ne se comparent pas à des vCPU mutualisés.
- **Une seule façon de déployer** — un niveau de service ne doit pas induire une chaîne de déploiement distincte.

## Considered Options

1. **Tout en physique** — statu quo.
2. **Tout en instances** — socle unique virtualisé.
3. **Niveaux de service** — le socle est choisi par projet selon l'exigence de disponibilité, et facturé comme tel.

## Decision Outcome

**Option 3 — établir des niveaux de service, dont l'exigence de disponibilité détermine le socle.**

Un socle unique impose à tous les projets le coût du plus exigeant, ou à tous le plafond du moins cher. L'exigence de disponibilité varie réellement d'un client à l'autre, elle est déjà facturée, et elle est le seul critère qui **élimine** des options plutôt que de les pondérer : sans multi-AZ possible en physique, l'exigence ferme le choix avant tout arbitrage économique.

### Les niveaux

| | **Bronze** | **Silver** | **Gold** |
|---|---|---|---|
| Socle | Serveurs physiques, mono-AZ | Instances, région multi-AZ | Instances, région multi-AZ |
| Base de données | Auto-gérée | Managée, multi-AZ | Managée, multi-AZ |
| Reprise après incident | Restauration de sauvegarde | Instantané, reconstruction | Instantané, reconstruction |
| Engagement | Aucun | Objectif annoncé | **SLA contractuel, astreinte, RTO/RPO** |

**Ce qui distingue Gold de Silver est contractuel, pas technique.** Le saut d'infrastructure a déjà été fait en Silver ; ce qu'un client achète au-delà est un engagement écrit et une astreinte humaine. Ajouter une couche technique supplémentaire à ce niveau — orchestrateur, multi-région — augmenterait la charge d'exploitation sans répondre à ce qui est demandé.

**L'empaquetage ne varie pas selon le niveau.** Une seule image applicative, déployée sur les trois socles. Un niveau qui induirait sa propre chaîne de déploiement coûterait davantage qu'il ne rapporte.

**Par défaut, un nouveau projet est en Silver.** Le physique devient un choix explicite, justifié par un besoin de puissance ou une contrainte de budget acceptée — non plus l'option retenue faute d'avoir posé la question.

**Ce qui reste à arrêter** : les prix de chaque niveau, les valeurs de RTO/RPO, et ce que recouvre l'astreinte. Ces décisions sont commerciales et ne relèvent pas de cet ADR.

## Pros and Cons of the Options

### Option 1 — tout en physique

- Bon, parce que le coût est le plus bas à ressource nominale égale et que les cœurs sont dédiés.
- Bon, parce qu'aucune migration n'est à financer.
- **Mauvais, parce qu'il plafonne toute l'agence au mono-AZ.** Aucun projet ne peut se voir proposer de la redondance de zone, quelle que soit l'exigence du client.
- Mauvais, parce que le patching reste non réversible, donc reste peu fait.
- Mauvais, parce que la capacité est dimensionnée pour le pic et payée en continu.

### Option 2 — tout en instances

- Bon, parce que le patching devient réversible partout, et le multi-AZ accessible partout.
- Bon, parce qu'un seul socle est plus simple à exploiter et à documenter.
- **Mauvais, parce qu'il fait payer la haute disponibilité à des projets qui ne l'exigent pas.** À gabarit comparable, l'instance coûte nettement plus cher que la machine physique.
- Mauvais, parce qu'il renonce aux cœurs dédiés sur les projets où la puissance brute compte.

### Option 3 — niveaux de service

- Bon, parce que **le coût du socle est porté par le client qui exige la disponibilité**, et par lui seul.
- Bon, parce que le niveau se discute à la vente, quand l'exigence est encore négociable.
- Bon, parce que le physique reste disponible là où il est pertinent, sans être le défaut par absence de décision.
- Bon, parce que le mono-AZ cesse d'être un risque subi pour devenir un niveau assumé et annoncé.
- Neutre, parce que le parc reste hétérogène — mais l'hétérogénéité devient un choix documenté plutôt qu'un héritage.
- **Mauvais, parce que trois niveaux sont trois configurations à savoir exploiter**, là où un socle unique n'en demande qu'une.
- Mauvais, parce que vendre du Bronze engage l'agence sur un niveau dont la reprise après incident n'a jamais été éprouvée.

## Consequences

- **Bon : l'exigence de disponibilité est posée à la vente.** Elle est aujourd'hui découverte après coup, alors que le socle est déjà choisi et qu'en changer coûte une migration.

- **Neutre : le patching reste à faire.** Le niveau Silver le rend réversible, donc praticable — il ne l'automatise pas. La dérive de l'environnement d'exécution relève de l'empaquetage, pas du socle.
- **Neutre : les bases de données sont hors du champ de cet ADR.** Le tableau indique le socle associé à chaque niveau ; le choix d'une offre managée et son dimensionnement relèvent d'une décision distincte.

- **Mauvais : le niveau Bronze expose un risque qui n'a jamais été éprouvé.** Une base auto-gérée sans réplication, sur un socle mono-AZ, n'a pas connu d'incident — ce qui ne renseigne pas sur le temps de reprise réel. **Vendre ce niveau sans avoir testé une restauration revient à annoncer un délai inconnu.**
- **Mauvais : le coût de migration des projets existants n'est pas chiffré.** Cet ADR fixe le défaut des nouveaux projets ; la reprise de l'existant se décide projet par projet.
- **Mauvais : le niveau Gold suppose une astreinte.** C'est un engagement d'équipe, pas une acquisition technique, et il n'existe pas aujourd'hui.

## Confirmation

1. **Éprouver une restauration complète sur un projet Bronze**, et en mesurer la durée. **Sans ce chiffre, le niveau ne peut pas être annoncé à un client.**
2. **Chiffrer chaque niveau** à partir des tarifs relevés, et arrêter les prix de vente.
3. **Rapporter la charge réelle à la capacité installée** sur les projets physiques. L'argument de performance du physique n'est évaluable que contre un besoin mesuré.
4. **Arrêter les valeurs de RTO/RPO et le périmètre de l'astreinte** avant toute vente d'un niveau Gold.

## More Information

Les tarifs catalogue des deux fournisseurs français sont relevés dans l'étude d'empaquetage et d'hébergement (septembre 2026), dont cet ADR est issu, à la date du 18 septembre 2026. Ils ne portent ni remise ni engagement négocié : le coût réel de chaque niveau doit être établi à partir de la facturation effective.

Deux faits en ressortent, vérifiés chez les deux fournisseurs : **le bare metal n'est éligible à aucune région multi-AZ**, et **la région multi-AZ ne renchérit pas les instances** — chez OVHcloud, le tarif des instances, du stockage bloc et du trafic est identique en mono-AZ et en multi-AZ.
