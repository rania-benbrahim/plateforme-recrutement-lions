/**
 * PLATEFORME DE RECRUTEMENT — LIONS CLUB IHEC CARTHAGE
 * Mandat 2026-2027
 *
 * Configuration avant déploiement :
 *   - DOSSIER_PHOTOS_ID : ID du dossier Google Drive qui reçoit les photos des candidats
 *   - CLE_SECRETE       : chaîne secrète utilisée pour générer les liens personnels et le lien jury
 *   - LIEN_GROUPE       : lien d'invitation du groupe de discussion des nouveaux membres
 */

// ---------------------------------------------------------------------------
// PARAMÈTRES TECHNIQUES
// ---------------------------------------------------------------------------

var DOSSIER_PHOTOS_ID = 'VOTRE_ID_DOSSIER_PHOTOS';
var NOM_LOGO = 'logo_lions_club_ihec_transparent.png';
var CLE_SECRETE = 'VOTRE_CLE_SECRETE';

var LIGNE_ENTETE = 4;
var PREMIERE_LIGNE = 5;

var C = {
  id: 1, horodatage: 2, nom: 3, prenom: 4, email: 5, telephone: 6, naissance: 7,
  annee: 8, dept1: 9, dept2: 10, dept3: 11, axe: 12, competences: 13,
  pourquoi: 14, experience: 15, apport: 16, disponibilites: 17, connu: 18,
  photo: 19, creneau: 20, dateHeure: 21, historique: 22, presence: 23, fiche: 24
};

var CR = { id: 1, date: 2, heure: 3, salle: 4, capacite: 5, reservations: 6, statut: 7 };

var E = {
  horodatage: 1, idCandidat: 2, nomCandidat: 3, evaluateur: 4, departement: 5,
  note1: 6, note8: 13, faute: 14, motif: 15, total: 16, pourcent: 17,
  avisSuggere: 18, avisFinal: 19, remarques: 20
};

var THEMES = ['Connaissances', 'Motivation', 'Expériences', 'Communication interne',
              'Confiance en soi', 'The topic (action)', 'Département', 'Disponibilité'];

// ---------------------------------------------------------------------------
// OUTILS
// ---------------------------------------------------------------------------

function classeur_() {
  return SpreadsheetApp.getActive();
}

function onglet_(nom) {
  var f = classeur_().getSheetByName(nom);
  if (!f) throw new Error('Onglet introuvable : ' + nom);
  return f;
}

function parametre_(libelle) {
  var valeurs = onglet_('Paramètres').getRange('B1:C40').getValues();
  for (var i = 0; i < valeurs.length; i++) {
    if (String(valeurs[i][0]).trim().toLowerCase() === libelle.trim().toLowerCase()) {
      return valeurs[i][1];
    }
  }
  return '';
}

function liste_(colonne) {
  var f = onglet_('Paramètres');
  var valeurs = f.getRange(6, colonne, 30, 1).getValues();
  var sortie = [];
  for (var i = 0; i < valeurs.length; i++) {
    var v = String(valeurs[i][0]).trim();
    if (v) sortie.push(v);
  }
  return sortie;
}

function texte_(valeur) {
  if (valeur instanceof Date) {
    return Utilities.formatDate(valeur, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  }
  return String(valeur === null || valeur === undefined ? '' : valeur).trim();
}

function heure_(valeur) {
  if (valeur instanceof Date) {
    return Utilities.formatDate(valeur, Session.getScriptTimeZone(), 'HH:mm');
  }
  return String(valeur || '').trim();
}

function jeton_(id) {
  var brut = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, id + CLE_SECRETE);
  return Utilities.base64EncodeWebSafe(brut).replace(/=+$/, '');
}

function jetonJury_() {
  return jeton_('JURY-INTERNE');
}

function urlApplication_() {
  return String(ScriptApp.getService().getUrl() || '').replace(/\/dev$/, '/exec');
}

function miniature_(lienDrive) {
  var m = String(lienDrive || '').match(/[-\w]{25,}/);
  return m ? 'https://drive.google.com/thumbnail?id=' + m[0] + '&sz=w400' : '';
}

// ---------------------------------------------------------------------------
// PAGES WEB
// ---------------------------------------------------------------------------

function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) || 'candidature';

  if (page === 'creneau') {
    var modele = HtmlService.createTemplateFromFile('Creneau');
    modele.donnees = donneesReprogrammation_(e.parameter.id, e.parameter.t);
    return modele.evaluate()
      .setTitle('Modifier mon créneau — Lions Club IHEC Carthage')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'jury') {
    var jury = HtmlService.createTemplateFromFile('Jury');
    jury.jeton = (e.parameter.t === jetonJury_()) ? e.parameter.t : '';
    return jury.evaluate()
      .setTitle('Plateforme jury — Lions Club IHEC Carthage')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  return HtmlService.createTemplateFromFile('Candidature').evaluate()
    .setTitle('Candidature — Lions Club IHEC Carthage')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------------------------------------------------------------------------
// FORMULAIRE DE CANDIDATURE
// ---------------------------------------------------------------------------

function donneesFormulaire() {
  return {
    departements: liste_(6),
    annees: liste_(7),
    axes: liste_(8),
    competences: liste_(9),
    creneaux: creneauxDisponibles_(),
    club: texte_(parametre_('Nom du club')),
    lieu: texte_(parametre_('Lieu des entretiens'))
  };
}

function creneauxDisponibles_(creneauActuel) {
  var f = onglet_('Créneaux');
  var nb = f.getLastRow() - LIGNE_ENTETE;
  if (nb <= 0) return [];

  var lignes = f.getRange(PREMIERE_LIGNE, 1, nb, 5).getValues();
  var reserves = compterReservations_();
  var sortie = [];

  for (var i = 0; i < lignes.length; i++) {
    var id = texte_(lignes[i][CR.id - 1]);
    if (!id) continue;

    var capacite = Number(lignes[i][CR.capacite - 1]) || 0;
    var pris = reserves[id] || 0;
    var restant = capacite - pris;

    if (restant > 0 || id === creneauActuel) {
      sortie.push({
        id: id,
        date: texte_(lignes[i][CR.date - 1]),
        heure: heure_(lignes[i][CR.heure - 1]),
        salle: texte_(lignes[i][CR.salle - 1]),
        restant: restant
      });
    }
  }
  return sortie;
}

function compterReservations_() {
  var f = onglet_('Candidats');
  var nb = f.getLastRow() - LIGNE_ENTETE;
  var compte = {};
  if (nb <= 0) return compte;

  var valeurs = f.getRange(PREMIERE_LIGNE, C.creneau, nb, 1).getValues();
  for (var i = 0; i < valeurs.length; i++) {
    var id = texte_(valeurs[i][0]);
    if (id) compte[id] = (compte[id] || 0) + 1;
  }
  return compte;
}

function enregistrerCandidature(donnees) {
  var verrou = LockService.getScriptLock();
  verrou.waitLock(30000);

  try {
    var obligatoires = ['nom', 'prenom', 'email', 'telephone', 'annee',
                        'dept1', 'dept2', 'dept3', 'axe', 'pourquoi', 'creneau'];
    for (var i = 0; i < obligatoires.length; i++) {
      if (!donnees[obligatoires[i]]) {
        return { ok: false, message: 'Merci de remplir tous les champs obligatoires.' };
      }
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(donnees.email)) {
      return { ok: false, message: 'Adresse email invalide.' };
    }

    var f = onglet_('Candidats');

    if (ligneParEmail_(donnees.email) > 0) {
      return { ok: false, message: 'Une candidature existe déjà avec cette adresse email.' };
    }

    var creneau = trouverCreneau_(donnees.creneau);
    if (!creneau) return { ok: false, message: 'Créneau introuvable.' };
    var reserves = compterReservations_();
    if ((reserves[creneau.id] || 0) >= creneau.capacite) {
      return { ok: false, message: 'Ce créneau vient d\'être complété. Merci d\'en choisir un autre.',
               creneaux: creneauxDisponibles_() };
    }

    var id = prochainIdentifiant_();
    var ligne = prochaineLigne_(f);

    var lienPhoto = '';
    if (donnees.photo && donnees.photo.base64) {
      lienPhoto = enregistrerPhoto_(donnees.photo, id, donnees.nom, donnees.prenom);
    }

    var valeurs = [];
    valeurs[C.id - 1] = id;
    valeurs[C.horodatage - 1] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    valeurs[C.nom - 1] = donnees.nom;
    valeurs[C.prenom - 1] = donnees.prenom;
    valeurs[C.email - 1] = donnees.email;
    valeurs[C.telephone - 1] = donnees.telephone;
    valeurs[C.naissance - 1] = donnees.naissance || '';
    valeurs[C.annee - 1] = donnees.annee;
    valeurs[C.dept1 - 1] = donnees.dept1;
    valeurs[C.dept2 - 1] = donnees.dept2;
    valeurs[C.dept3 - 1] = donnees.dept3;
    valeurs[C.axe - 1] = donnees.axe;
    valeurs[C.competences - 1] = (donnees.competences || []).join(', ');
    valeurs[C.pourquoi - 1] = donnees.pourquoi;
    valeurs[C.experience - 1] = donnees.experience || '';
    valeurs[C.apport - 1] = donnees.apport || '';
    valeurs[C.disponibilites - 1] = donnees.disponibilites || '';
    valeurs[C.connu - 1] = donnees.connu || '';
    valeurs[C.photo - 1] = lienPhoto;
    valeurs[C.creneau - 1] = creneau.id;

    f.getRange(ligne, 1, 1, C.creneau).setValues([valeurs.slice(0, C.creneau)]);
    f.getRange(ligne, C.presence).setValue('En attente');

    envoyerEmailConfirmation_(id, donnees, creneau, false);

    return { ok: true, id: id, creneau: libelleCreneau_(creneau), email: donnees.email };

  } catch (err) {
    return { ok: false, message: 'Erreur technique : ' + err.message };
  } finally {
    verrou.releaseLock();
  }
}

function prochainIdentifiant_() {
  var f = onglet_('Candidats');
  var nb = f.getLastRow() - LIGNE_ENTETE;
  var max = 0;
  if (nb > 0) {
    var ids = f.getRange(PREMIERE_LIGNE, C.id, nb, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      var v = texte_(ids[i][0]);
      if (/^C\d+$/.test(v)) max = Math.max(max, parseInt(v.substring(1), 10));
    }
  }
  var numero = max + 1;
  return 'C' + (numero < 100 ? ('00' + numero).slice(-3) : numero);
}

function prochaineLigne_(f) {
  var nb = Math.max(f.getMaxRows() - LIGNE_ENTETE, 1);
  var ids = f.getRange(PREMIERE_LIGNE, C.id, nb, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (!texte_(ids[i][0])) return PREMIERE_LIGNE + i;
  }
  return f.getLastRow() + 1;
}

function ligneParEmail_(email) {
  var f = onglet_('Candidats');
  var nb = f.getLastRow() - LIGNE_ENTETE;
  if (nb <= 0) return -1;
  var valeurs = f.getRange(PREMIERE_LIGNE, C.email, nb, 1).getValues();
  for (var i = 0; i < valeurs.length; i++) {
    if (texte_(valeurs[i][0]).toLowerCase() === String(email).trim().toLowerCase()) {
      return PREMIERE_LIGNE + i;
    }
  }
  return -1;
}

function ligneParId_(id) {
  var f = onglet_('Candidats');
  var nb = f.getLastRow() - LIGNE_ENTETE;
  if (nb <= 0) return -1;
  var valeurs = f.getRange(PREMIERE_LIGNE, C.id, nb, 1).getValues();
  for (var i = 0; i < valeurs.length; i++) {
    if (texte_(valeurs[i][0]) === String(id).trim()) return PREMIERE_LIGNE + i;
  }
  return -1;
}

function trouverCreneau_(idCreneau) {
  var f = onglet_('Créneaux');
  var nb = f.getLastRow() - LIGNE_ENTETE;
  if (nb <= 0) return null;
  var lignes = f.getRange(PREMIERE_LIGNE, 1, nb, 5).getValues();
  for (var i = 0; i < lignes.length; i++) {
    if (texte_(lignes[i][CR.id - 1]) === String(idCreneau).trim()) {
      return {
        id: texte_(lignes[i][CR.id - 1]),
        date: texte_(lignes[i][CR.date - 1]),
        heure: heure_(lignes[i][CR.heure - 1]),
        salle: texte_(lignes[i][CR.salle - 1]),
        capacite: Number(lignes[i][CR.capacite - 1]) || 0
      };
    }
  }
  return null;
}

function libelleCreneau_(creneau) {
  var texteCreneau = creneau.date + ' à ' + creneau.heure;
  if (creneau.salle) texteCreneau += ' (' + creneau.salle + ')';
  return texteCreneau;
}

function enregistrerPhoto_(photo, id, nom, prenom) {
  try {
    var dossier;
    try {
      dossier = DriveApp.getFolderById(DOSSIER_PHOTOS_ID);
    } catch (e) {
      var parent = DriveApp.getFileById(classeur_().getId()).getParents();
      dossier = parent.hasNext() ? parent.next().createFolder('Photos candidats')
                                 : DriveApp.createFolder('Photos candidats');
    }

    var octets = Utilities.base64Decode(photo.base64);
    var blob = Utilities.newBlob(octets, photo.type || 'image/jpeg',
                                 id + '_' + nom + '_' + prenom + '.jpg');
    var fichier = dossier.createFile(blob);
    fichier.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return fichier.getUrl();
  } catch (err) {
    return '';
  }
}

// ---------------------------------------------------------------------------
// EMAILS
// ---------------------------------------------------------------------------

function logoDuClub_() {
  try {
    var fichiers = DriveApp.getFilesByName(NOM_LOGO);
    if (fichiers.hasNext()) return fichiers.next().getBlob().setName('logo');
  } catch (e) {}
  return null;
}

function envoyerEmailConfirmation_(id, donnees, creneau, estModification) {
  var lieu = texte_(parametre_('Lieu des entretiens'));
  var lien = urlApplication_() + '?page=creneau&id=' + id + '&t=' + jeton_(id);
  var logo = logoDuClub_();

  var titre = estModification
    ? 'Ton nouveau créneau d\'entretien — Lions Club IHEC Carthage'
    : 'Confirmation de ta candidature — Lions Club IHEC Carthage';

  var intro = estModification
    ? 'Ton créneau d\'entretien a bien été modifié.'
    : 'Merci pour ta candidature pour rejoindre le <b>Lions Club IHEC Carthage</b> !';

  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;' +
    'border:1px solid #E5E7EB;border-radius:10px;overflow:hidden">' +
      '<div style="background:#00338D;padding:20px;text-align:center">' +
        (logo ? '<img src="cid:logo" width="70" style="display:block;margin:auto 0 10px">' : '') +
        '<div style="color:#FFCD00;font-size:13px;letter-spacing:1px">LIONS CLUB IHEC CARTHAGE</div>' +
        '<div style="color:#fff;font-size:20px;font-weight:bold;margin-top:6px">' +
          (estModification ? 'Créneau modifié' : 'Candidature reçue') + '</div>' +
      '</div>' +
      '<div style="padding:24px;color:#1F2937;font-size:14px;line-height:1.6">' +
        '<p>Bonjour ' + donnees.prenom + ',</p>' +
        '<p>' + intro + '</p>' +
        '<p>Ton numéro de candidat : <b>' + id + '</b></p>' +
        '<div style="background:#F3F6FB;border-left:4px solid #FFCD00;padding:14px;margin:18px 0">' +
          '<div style="font-weight:bold;color:#00338D;margin-bottom:6px">Ton entretien</div>' +
          '<div>' + creneau.date + ' à ' + creneau.heure +
          (creneau.salle ? '<br>' + creneau.salle : '') +
          (lieu ? '<br>' + lieu : '') + '</div>' +
        '</div>' +
        '<p>Pense à arriver 10 minutes en avance.</p>' +
        '<p style="text-align:center;margin:26px 0">' +
          '<a href="' + lien + '" style="background:#00338D;color:#fff;text-decoration:none;' +
          'padding:12px 22px;border-radius:6px;display:inline-block">Modifier mon créneau</a>' +
        '</p>' +
        '<p style="color:#6B7280;font-size:12px">Ce lien est personnel, ne le partage pas.</p>' +
        '<p>À très bientôt,<br><b>L\'équipe du Lions Club IHEC Carthage</b></p>' +
      '</div>' +
    '</div>';

  var options = { htmlBody: html, name: 'Lions Club IHEC Carthage' };
  if (logo) options.inlineImages = { logo: logo };

  MailApp.sendEmail(donnees.email, titre, '', options);
}

// ---------------------------------------------------------------------------
// CHANGEMENT DE CRÉNEAU
// ---------------------------------------------------------------------------

function donneesReprogrammation_(id, jetonRecu) {
  if (!id || !jetonRecu || jetonRecu !== jeton_(id)) {
    return { ok: false, message: 'Lien invalide ou expiré.' };
  }

  var ligne = ligneParId_(id);
  if (ligne < 0) return { ok: false, message: 'Candidature introuvable.' };

  var f = onglet_('Candidats');
  var donnees = f.getRange(ligne, 1, 1, C.fiche).getValues()[0];
  var creneauActuel = texte_(donnees[C.creneau - 1]);
  var creneau = trouverCreneau_(creneauActuel);

  var autorises = Number(parametre_('Changements de créneau autorisés')) || 0;
  var dejaFaits = (texte_(donnees[C.historique - 1]).match(/→/g) || []).length;

  return {
    ok: true,
    id: id,
    jeton: jetonRecu,
    prenom: texte_(donnees[C.prenom - 1]),
    creneauActuel: creneau ? libelleCreneau_(creneau) : creneauActuel,
    changementsRestants: Math.max(autorises - dejaFaits, 0),
    creneaux: creneauxDisponibles_(creneauActuel)
  };
}

function changerCreneau(id, jetonRecu, nouveauCreneau) {
  var verrou = LockService.getScriptLock();
  verrou.waitLock(30000);

  try {
    if (!id || jetonRecu !== jeton_(id)) return { ok: false, message: 'Lien invalide.' };

    var ligne = ligneParId_(id);
    if (ligne < 0) return { ok: false, message: 'Candidature introuvable.' };

    var f = onglet_('Candidats');
    var donnees = f.getRange(ligne, 1, 1, C.fiche).getValues()[0];
    var ancienId = texte_(donnees[C.creneau - 1]);
    if (ancienId === nouveauCreneau) return { ok: false, message: 'C\'est déjà ton créneau actuel.' };

    var autorises = Number(parametre_('Changements de créneau autorisés')) || 0;
    var historique = texte_(donnees[C.historique - 1]);
    var dejaFaits = (historique.match(/→/g) || []).length;
    if (dejaFaits >= autorises) {
      return { ok: false, message: 'Tu as déjà utilisé le nombre de changements autorisés. Contacte le club par email.' };
    }

    var ancien = trouverCreneau_(ancienId);
    var nouveau = trouverCreneau_(nouveauCreneau);
    if (!nouveau) return { ok: false, message: 'Créneau introuvable.' };

    var delai = Number(parametre_('Délai limite pour changer (heures avant)')) || 0;
    var debut = dateCreneau_(ancien);
    if (debut && delai > 0) {
      var limite = new Date(debut.getTime() - delai * 3600 * 1000);
      if (new Date() > limite) {
        return { ok: false, message: 'Le délai pour modifier ton créneau est dépassé. Contacte le club par email.' };
      }
    }

    var reserves = compterReservations_();
    if ((reserves[nouveau.id] || 0) >= nouveau.capacite) {
      return { ok: false, message: 'Ce créneau est complet. Choisis-en un autre.',
               creneaux: creneauxDisponibles_(ancienId) };
    }

    f.getRange(ligne, C.creneau).setValue(nouveau.id);
    var trace = (ancien ? ancien.date + ' ' + ancien.heure : ancienId) +
                ' → ' + nouveau.date + ' ' + nouveau.heure;
    f.getRange(ligne, C.historique).setValue(historique ? historique + ' | ' + trace : trace);

    envoyerEmailConfirmation_(id, {
      prenom: texte_(donnees[C.prenom - 1]),
      email: texte_(donnees[C.email - 1])
    }, nouveau, true);

    return { ok: true, creneau: libelleCreneau_(nouveau) };

  } catch (err) {
    return { ok: false, message: 'Erreur technique : ' + err.message };
  } finally {
    verrou.releaseLock();
  }
}

function dateCreneau_(creneau) {
  if (!creneau) return null;
  var d = String(creneau.date).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  var h = String(creneau.heure).match(/(\d{1,2})[:h](\d{2})/);
  if (!d) return null;
  return new Date(Number(d[3]), Number(d[2]) - 1, Number(d[1]),
                  h ? Number(h[1]) : 0, h ? Number(h[2]) : 0);
}

// ---------------------------------------------------------------------------
// PLATEFORME JURY
// ---------------------------------------------------------------------------

function lienJury() {
  var url = urlApplication_() + '?page=jury&t=' + jetonJury_();
  var html = '<div style="font-family:Arial;padding:16px;font-size:14px">' +
    '<p>Clique sur le bouton pour ouvrir la plateforme jury :</p>' +
    '<p><a href="' + url + '" target="_blank" style="background:#00338D;color:#fff;' +
    'text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block">' +
    'Ouvrir la plateforme jury</a></p>' +
    '<p style="margin-top:18px">Ou copie ce lien :</p>' +
    '<textarea style="width:100%;height:80px;font-size:12px">' + url + '</textarea>' +
    '<p style="color:#6B7280;font-size:12px">À envoyer uniquement aux membres du jury.</p></div>';

  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(460).setHeight(330),
    'Lien de la plateforme jury');
}

function donneesJury(jetonRecu) {
  if (jetonRecu !== jetonJury_()) return { ok: false, message: 'Lien invalide.' };

  var f = onglet_('Candidats');
  var nb = f.getLastRow() - LIGNE_ENTETE;
  var candidats = [];

  if (nb > 0) {
    var lignes = f.getRange(PREMIERE_LIGNE, 1, nb, C.fiche).getValues();
    var evaluations = comptesEvaluations_();

    for (var i = 0; i < lignes.length; i++) {
      var id = texte_(lignes[i][C.id - 1]);
      if (!id) continue;
      var creneau = trouverCreneau_(texte_(lignes[i][C.creneau - 1]));
      candidats.push({
        id: id,
        nom: texte_(lignes[i][C.nom - 1]) + ' ' + texte_(lignes[i][C.prenom - 1]),
        photo: miniature_(lignes[i][C.photo - 1]),
        departement: texte_(lignes[i][C.dept1 - 1]),
        date: creneau ? creneau.date : '',
        heure: creneau ? creneau.heure : '',
        salle: creneau ? creneau.salle : '',
        presence: texte_(lignes[i][C.presence - 1]) || 'En attente',
        evaluations: evaluations[id] || []
      });
    }
  }

  candidats.sort(function(a, b){
    return (a.date + a.heure).localeCompare(b.date + b.heure);
  });

  return { ok: true, evaluateurs: liste_(10), candidats: candidats };
}

function comptesEvaluations_() {
  var f = onglet_('Évaluations');
  var nb = f.getLastRow() - LIGNE_ENTETE;
  var sortie = {};
  if (nb <= 0) return sortie;
  var lignes = f.getRange(PREMIERE_LIGNE, 1, nb, E.remarques).getValues();
  for (var i = 0; i < lignes.length; i++) {
    var id = texte_(lignes[i][E.idCandidat - 1]);
    if (!id) continue;
    if (!sortie[id]) sortie[id] = [];
    sortie[id].push({
      evaluateur: texte_(lignes[i][E.evaluateur - 1]),
      avis: texte_(lignes[i][E.avisFinal - 1])
    });
  }
  return sortie;
}

function ficheCandidat(jetonRecu, id) {
  if (jetonRecu !== jetonJury_()) return { ok: false, message: 'Lien invalide.' };

  var ligne = ligneParId_(id);
  if (ligne < 0) return { ok: false, message: 'Candidat introuvable.' };

  var d = onglet_('Candidats').getRange(ligne, 1, 1, C.fiche).getValues()[0];
  var creneau = trouverCreneau_(texte_(d[C.creneau - 1]));

  return {
    ok: true,
    id: id,
    nom: texte_(d[C.nom - 1]) + ' ' + texte_(d[C.prenom - 1]),
    photo: miniature_(d[C.photo - 1]),
    email: texte_(d[C.email - 1]),
    telephone: texte_(d[C.telephone - 1]),
    annee: texte_(d[C.annee - 1]),
    departements: [texte_(d[C.dept1 - 1]), texte_(d[C.dept2 - 1]), texte_(d[C.dept3 - 1])],
    axe: texte_(d[C.axe - 1]),
    competences: texte_(d[C.competences - 1]),
    reponses: [
      { q: 'Pourquoi rejoindre le club ?', r: texte_(d[C.pourquoi - 1]) },
      { q: 'Expérience associative', r: texte_(d[C.experience - 1]) },
      { q: 'Ce qu\'il/elle peut apporter', r: texte_(d[C.apport - 1]) },
      { q: 'Disponibilités', r: texte_(d[C.disponibilites - 1]) },
      { q: 'Comment a connu le club', r: texte_(d[C.connu - 1]) }
    ],
    creneau: creneau ? libelleCreneau_(creneau) : '',
    presence: texte_(d[C.presence - 1]) || 'En attente',
    themes: THEMES,
    guide: guideEntretien_(texte_(d[C.dept1 - 1]))
  };
}

function guideEntretien_(departement) {
  var f = onglet_('Grille d\'entretien');
  var lignes = f.getRange(1, 2, f.getLastRow(), 2).getValues();
  var commun = [], bloc = [];

  var cle = 'RH';
  if (/sponsor/i.test(departement)) cle = 'Sponsoring';
  else if (/market|commun/i.test(departement)) cle = 'COM';

  for (var i = 0; i < lignes.length; i++) {
    var titre = texte_(lignes[i][0]);
    var texteQ = texte_(lignes[i][1]);
    if (!titre || !texteQ) continue;

    if (THEMES.indexOf(titre) >= 0 || titre === 'Informations complémentaires') {
      commun.push({ titre: titre, texte: texteQ });
    } else if (titre.indexOf(cle) === 0) {
      bloc.push({ titre: titre, texte: texteQ });
    }
  }
  return { commun: commun, bloc: bloc, departement: departement };
}

function enregistrerEvaluation(jetonRecu, donnees) {
  var verrou = LockService.getScriptLock();
  verrou.waitLock(30000);

  try {
    if (jetonRecu !== jetonJury_()) return { ok: false, message: 'Lien invalide.' };

    var recruteurs = (donnees.recruteurs || []).filter(function(n){ return String(n || '').trim(); });
    if (!recruteurs.length) return { ok: false, message: 'Indique le nom des recruteurs présents.' };
    if (!donnees.avis) return { ok: false, message: 'Choisis un avis final.' };

    var blocs = (donnees.remarques || []).filter(function(r){ return r && String(r.texte || '').trim(); });
    if (!blocs.length) return { ok: false, message: 'Au moins un recruteur doit écrire ses remarques.' };

    var notes = donnees.notes || [];
    for (var i = 0; i < 8; i++) {
      var n = Number(notes[i]);
      if (isNaN(n) || n < 0 || n > 10) return { ok: false, message: 'Chaque note doit être entre 0 et 10.' };
    }

    var texteRemarques = blocs.map(function(r){
      return r.nom + ' : ' + String(r.texte).trim();
    }).join('\n\n');

    var f = onglet_('Évaluations');
    var ligne = ligneEvaluation_(donnees.id);

    f.getRange(ligne, E.horodatage, 1, 2).setValues([[
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
      donnees.id
    ]]);
    f.getRange(ligne, E.evaluateur, 1, 12).setValues([[
      recruteurs.join(' & '), donnees.departement,
      notes[0], notes[1], notes[2], notes[3], notes[4], notes[5], notes[6], notes[7],
      donnees.faute ? 'Oui' : 'Non', donnees.motif || ''
    ]]);
    f.getRange(ligne, E.avisFinal, 1, 2).setValues([[donnees.avis, texteRemarques]]);
    f.getRange(ligne, E.remarques).setWrap(true);

    var candidat = ligneParId_(donnees.id);
    if (candidat > 0) {
      var c = onglet_('Candidats');
      if (texte_(c.getRange(candidat, C.presence).getValue()) !== 'Présent') {
        c.getRange(candidat, C.presence).setValue('Présent');
      }
    }

    return { ok: true, total: notes.reduce(function(a, b){ return a + Number(b); }, 0) };

  } catch (err) {
    return { ok: false, message: 'Erreur : ' + err.message };
  } finally {
    verrou.releaseLock();
  }
}

function ligneEvaluation_(id, evaluateur) {
  var f = onglet_('Évaluations');
  var nb = Math.max(f.getMaxRows() - LIGNE_ENTETE, 1);
  var lignes = f.getRange(PREMIERE_LIGNE, 1, nb, E.evaluateur).getValues();
  var libre = -1;

  for (var i = 0; i < lignes.length; i++) {
    var idLigne = texte_(lignes[i][E.idCandidat - 1]);
    if (idLigne === id && texte_(lignes[i][E.evaluateur - 1]) === evaluateur) {
      return PREMIERE_LIGNE + i;
    }
    if (!idLigne && libre < 0) libre = PREMIERE_LIGNE + i;
  }
  return libre > 0 ? libre : f.getLastRow() + 1;
}

function marquerAbsent(jetonRecu, id, evaluateur) {
  if (jetonRecu !== jetonJury_()) return { ok: false, message: 'Lien invalide.' };

  var ligne = ligneParId_(id);
  if (ligne < 0) return { ok: false, message: 'Candidat introuvable.' };

  var f = onglet_('Candidats');
  f.getRange(ligne, C.presence).setValue('Absent');

  var historique = texte_(f.getRange(ligne, C.historique).getValue());
  var trace = 'Absent (' + (evaluateur || 'jury') + ', ' +
              Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM HH:mm') + ')';
  f.getRange(ligne, C.historique).setValue(historique ? historique + ' | ' + trace : trace);

  return { ok: true };
}

// ---------------------------------------------------------------------------
// MENU DANS LE GOOGLE SHEETS
// ---------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Recrutement')
    .addItem('Afficher le lien du formulaire', 'afficherLienFormulaire')
    .addItem('Afficher le lien de la plateforme jury', 'lienJury')
    .addSeparator()
    .addItem('Relancer tous les candidats (créneaux)', 'relancerTousLesCandidats')
    .addItem('Envoyer les résultats', 'envoyerResultats')
    .addItem('Activer les rappels automatiques', 'activerRappels')
    .addToUi();
}

function afficherLienFormulaire() {
  var url = urlApplication_();
  SpreadsheetApp.getUi().alert(
    'Lien du formulaire de candidature',
    url ? url : 'Le script n\'est pas encore déployé. Fais Déployer -> Nouveau déploiement.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function afficherLienDansJournal() {
  Logger.log(urlApplication_() + '?page=jury&t=' + jetonJury_());
}

// ---------------------------------------------------------------------------
// ENVOI DES RÉSULTATS
// ---------------------------------------------------------------------------

var TB = { id: 1, nom: 2, dept: 3, creneau: 4, presence: 5, nbEval: 6, fav: 7,
           disc: 8, defav: 9, faute: 10, moyenne: 11, statut: 12, decision: 13, email: 14 };

function envoyerResultats() {
  var ui = SpreadsheetApp.getUi();
  var f = onglet_('Tableau de bord');
  var nb = f.getLastRow() - LIGNE_ENTETE;
  if (nb <= 0) return ui.alert('Aucun candidat.');

  var lignes = f.getRange(PREMIERE_LIGNE, 1, nb, TB.email).getValues();
  var aEnvoyer = [];

  for (var i = 0; i < lignes.length; i++) {
    var id = texte_(lignes[i][TB.id - 1]);
    var decision = texte_(lignes[i][TB.decision - 1]);
    var envoye = texte_(lignes[i][TB.email - 1]);
    if (id && decision && envoye !== 'Oui') {
      aEnvoyer.push({ ligne: PREMIERE_LIGNE + i, id: id, decision: decision });
    }
  }

  if (!aEnvoyer.length) {
    return ui.alert('Rien à envoyer',
      'Tous les candidats ayant une décision ont déjà reçu leur email.', ui.ButtonSet.OK);
  }

  var compte = { 'Accepté': 0, 'Refusé': 0, 'Liste d\'attente': 0 };
  aEnvoyer.forEach(function(c){ compte[c.decision] = (compte[c.decision] || 0) + 1; });

  var reponse = ui.alert('Envoyer les résultats',
    compte['Accepté'] + ' accepté(s), ' + compte['Refusé'] + ' refusé(s), ' +
    compte['Liste d\'attente'] + ' en liste d\'attente.\n\nConfirmer l\'envoi ?',
    ui.ButtonSet.YES_NO);
  if (reponse !== ui.Button.YES) return;

  var envoyes = 0, erreurs = [];

  aEnvoyer.forEach(function(c){
    try {
      var ligneCandidat = ligneParId_(c.id);
      if (ligneCandidat < 0) throw new Error('candidat introuvable');
      var d = onglet_('Candidats').getRange(ligneCandidat, 1, 1, C.fiche).getValues()[0];
      envoyerEmailResultat_(c.decision, {
        prenom: texte_(d[C.prenom - 1]),
        email: texte_(d[C.email - 1]),
        dept: texte_(d[C.dept1 - 1])
      });
      f.getRange(c.ligne, TB.email).setValue('Oui');
      envoyes++;
    } catch (err) {
      erreurs.push(c.id + ' : ' + err.message);
    }
  });

  ui.alert('Envoi terminé',
    envoyes + ' email(s) envoyé(s).' + (erreurs.length ? '\n\nErreurs :\n' + erreurs.join('\n') : ''),
    ui.ButtonSet.OK);
}

var LIEN_GROUPE = 'VOTRE_LIEN_GROUPE';

function envoyerEmailResultat_(decision, candidat) {
  var logo = logoDuClub_();
  var cotisation = texte_(parametre_('Cotisation annuelle (DT)'));
  var contact = texte_(parametre_('Email officiel du club'));
  var titre, bandeau, corps;

  if (decision === 'Accepté') {
    titre = 'Félicitations ! Bienvenue au Lions Club IHEC Carthage';
    bandeau = 'Bienvenue parmi nous';
    corps =
      '<p>Félicitations ' + candidat.prenom + ' !</p>' +
      '<p>Nous avons le plaisir de t\'annoncer que ta candidature a été retenue. ' +
      'Tu fais désormais partie du <b>Lions Club IHEC Carthage</b> !</p>' +
      '<p>Ton parcours, ta motivation et ton état d\'esprit nous ont convaincus, et nous sommes ' +
      'impatients de te voir à l\'œuvre sur nos actions.</p>' +
      '<div style="background:#F3F6FB;border-left:4px solid #FFCD00;padding:14px;margin:18px 0">' +
        '<div style="font-weight:bold;color:#00338D;margin-bottom:8px">Tes prochaines étapes</div>' +
        '<div style="margin-bottom:10px">' +
          '<b>1. Rejoins le groupe de discussion</b><br>' +
          'Toutes les informations et les annonces y passent.<br>' +
          '<a href="' + LIEN_GROUPE + '" style="color:#00338D">Rejoindre le groupe</a>' +
        '</div>' +
        '<div style="margin-bottom:10px">' +
          '<b>2. Prépare-toi pour le week-end d\'intégration</b><br>' +
          'C\'est le moment où tu feras vraiment connaissance avec l\'équipe. ' +
          'Les détails arrivent très bientôt dans le groupe.' +
        '</div>' +
        '<div>' +
          '<b>3. Cotisation</b><br>' +
          'La cotisation internationale et nationale est de <b>' + (cotisation || '120') +
          ' DT</b> pour le reste du mandat.' +
        '</div>' +
      '</div>' +
      '<p>Encore bravo, et bienvenue dans l\'aventure !</p>';

  } else if (decision === 'Liste d\'attente') {
    titre = 'Ta candidature — Lions Club IHEC Carthage';
    bandeau = 'Candidature en liste d\'attente';
    corps =
      '<p>Bonjour ' + candidat.prenom + ',</p>' +
      '<p>Merci d\'avoir passé ton entretien avec nous. Ta candidature nous a intéressés, ' +
      'mais le nombre de places disponibles est limité cette année.</p>' +
      '<p>Tu es donc placé(e) sur notre <b>liste d\'attente</b> : si une place se libère, ' +
      'nous te recontacterons en priorité.</p>' +
      '<p>Merci pour ton temps et ton intérêt pour le club.</p>';

  } else {
    titre = 'Ta candidature — Lions Club IHEC Carthage';
    bandeau = 'Réponse à ta candidature';
    corps =
      '<p>Bonjour ' + candidat.prenom + ',</p>' +
      '<p>Merci d\'avoir postulé au Lions Club IHEC Carthage et d\'être venu(e) passer ton ' +
      'entretien avec nous. Nous avons reçu un très grand nombre de candidatures cette année, ' +
      'et chacune a été étudiée avec attention.</p>' +
      '<p>Malheureusement, ta candidature n\'a pas été retenue cette fois-ci. Le nombre de ' +
      'places disponibles était limité, et ce choix a été difficile pour le bureau.</p>' +
      '<p>Cela ne remet en rien en cause ta motivation ni ta valeur : nous t\'encourageons ' +
      'vivement à retenter ta chance lors du prochain recrutement, nous serons ravis de te ' +
      'revoir parmi les candidats.</p>' +
      '<p>D\'ici là, nos actions restent ouvertes à tous : suis-nous sur nos réseaux pour y ' +
      'participer et découvrir la vie du club.</p>' +
      '<p>Merci encore pour ton temps, ton intérêt et ton engagement.</p>';
  }

  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;' +
    'border:1px solid #E5E7EB;border-radius:10px;overflow:hidden">' +
      '<div style="background:#00338D;padding:20px;text-align:center">' +
        (logo ? '<img src="cid:logo" width="70" style="display:block;margin:auto 0 10px">' : '') +
        '<div style="color:#FFCD00;font-size:13px;letter-spacing:1px">LIONS CLUB IHEC CARTHAGE</div>' +
        '<div style="color:#fff;font-size:20px;font-weight:bold;margin-top:6px">' + bandeau + '</div>' +
      '</div>' +
      '<div style="padding:24px;color:#1F2937;font-size:14px;line-height:1.6">' + corps +
        '<p>Pour toute question : ' + contact + '</p>' +
        '<p>À bientôt,<br><b>Le secrétariat du Lions Club IHEC Carthage</b></p>' +
      '</div>' +
    '</div>';

  var options = { htmlBody: html, name: 'Lions Club IHEC Carthage' };
  if (logo) options.inlineImages = { logo: logo };

  MailApp.sendEmail(candidat.email, titre, '', options);
}

// ---------------------------------------------------------------------------
// RAPPEL AUTOMATIQUE LA VEILLE
// ---------------------------------------------------------------------------

function envoyerRappels() {
  var f = onglet_('Candidats');
  var nb = f.getLastRow() - LIGNE_ENTETE;
  if (nb <= 0) return 0;

  var demain = new Date();
  demain.setDate(demain.getDate() + 1);
  var cible = Utilities.formatDate(demain, Session.getScriptTimeZone(), 'dd/MM/yyyy');

  var lignes = f.getRange(PREMIERE_LIGNE, 1, nb, C.fiche).getValues();
  var envoyes = 0;
  var lieu = texte_(parametre_('Lieu des entretiens'));
  var logo = logoDuClub_();

  for (var i = 0; i < lignes.length; i++) {
    var id = texte_(lignes[i][C.id - 1]);
    if (!id) continue;
    if (texte_(lignes[i][C.presence - 1]) === 'Absent') continue;

    var creneau = trouverCreneau_(texte_(lignes[i][C.creneau - 1]));
    if (!creneau || creneau.date !== cible) continue;

    var historique = texte_(lignes[i][C.historique - 1]);
    if (historique.indexOf('Rappel ' + cible) >= 0) continue;

    var html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;' +
      'border:1px solid #E5E7EB;border-radius:10px;overflow:hidden">' +
        '<div style="background:#00338D;padding:20px;text-align:center">' +
          (logo ? '<img src="cid:logo" width="70" style="display:block;margin:auto 0 10px">' : '') +
          '<div style="color:#FFCD00;font-size:13px;letter-spacing:1px">LIONS CLUB IHEC CARTHAGE</div>' +
          '<div style="color:#fff;font-size:20px;font-weight:bold;margin-top:6px">C\'est demain !</div>' +
        '</div>' +
        '<div style="padding:24px;color:#1F2937;font-size:14px;line-height:1.6">' +
          '<p>Bonjour ' + texte_(lignes[i][C.prenom - 1]) + ',</p>' +
          '<p>Petit rappel : ton entretien avec le Lions Club IHEC Carthage a lieu <b>demain</b>.</p>' +
          '<div style="background:#F3F6FB;border-left:4px solid #FFCD00;padding:14px;margin:18px 0">' +
            '<b>' + creneau.date + ' à ' + creneau.heure + '</b>' +
            (creneau.salle ? '<br>' + creneau.salle : '') +
            (lieu ? '<br>' + lieu : '') +
          '</div>' +
          '<p>Pense à arriver 10 minutes en avance. À demain !</p>' +
          '<p><b>L\'équipe du Lions Club IHEC Carthage</b></p>' +
        '</div>' +
      '</div>';

    var options = { htmlBody: html, name: 'Lions Club IHEC Carthage' };
    if (logo) options.inlineImages = { logo: logo };

    try {
      MailApp.sendEmail(texte_(lignes[i][C.email - 1]),
        'Rappel : ton entretien est demain — Lions Club IHEC Carthage', '', options);
      f.getRange(PREMIERE_LIGNE + i, C.historique)
       .setValue(historique ? historique + ' | Rappel ' + cible : 'Rappel ' + cible);
      envoyes++;
    } catch (err) {}
  }
  return envoyes;
}

function activerRappels() {
  var ui = SpreadsheetApp.getUi();
  var declencheurs = ScriptApp.getProjectTriggers();
  for (var i = 0; i < declencheurs.length; i++) {
    if (declencheurs[i].getHandlerFunction() === 'envoyerRappels') {
      ScriptApp.deleteTrigger(declencheurs[i]);
    }
  }
  ScriptApp.newTrigger('envoyerRappels').timeBased().atHour(18).everyDays(1).create();
  ui.alert('Rappels activés',
    'Chaque jour vers 18h, les candidats dont l\'entretien a lieu le lendemain recevront ' +
    'automatiquement un email de rappel.', ui.ButtonSet.OK);
}

// ---------------------------------------------------------------------------
// RELANCE : CHOISIR UN NOUVEAU CRÉNEAU
// ---------------------------------------------------------------------------

function relancerCreneauxInvalides() {
  var ui = SpreadsheetApp.getUi();
  var f = onglet_('Candidats');
  var nb = f.getLastRow() - LIGNE_ENTETE;
  if (nb <= 0) return ui.alert('Aucun candidat.');

  var lignes = f.getRange(PREMIERE_LIGNE, 1, nb, C.fiche).getValues();
  var aRelancer = [];

  for (var i = 0; i < lignes.length; i++) {
    var id = texte_(lignes[i][C.id - 1]);
    if (!id) continue;
    if (texte_(lignes[i][C.presence - 1]) === 'Absent') continue;
    if (!trouverCreneau_(texte_(lignes[i][C.creneau - 1]))) {
      aRelancer.push({
        id: id,
        prenom: texte_(lignes[i][C.prenom - 1]),
        email: texte_(lignes[i][C.email - 1])
      });
    }
  }

  if (!aRelancer.length) {
    return ui.alert('Rien à faire', 'Tous les candidats ont un créneau valide.', ui.ButtonSet.OK);
  }

  var reponse = ui.alert('Relancer les candidats',
    aRelancer.length + ' candidat(s) ont un créneau introuvable.\n\n' +
    'Leur envoyer un email pour choisir un nouveau créneau ?', ui.ButtonSet.YES_NO);
  if (reponse !== ui.Button.YES) return;

  var logo = logoDuClub_();
  var lieu = texte_(parametre_('Lieu des entretiens'));
  var envoyes = 0;

  aRelancer.forEach(function(c) {
    try {
      var lien = urlApplication_() + '?page=creneau&id=' + c.id + '&t=' + jeton_(c.id);
      var html =
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;' +
        'border:1px solid #E5E7EB;border-radius:10px;overflow:hidden">' +
          '<div style="background:#00338D;padding:20px;text-align:center">' +
            (logo ? '<img src="cid:logo" width="70" style="display:block;margin:auto 0 10px">' : '') +
            '<div style="color:#FFCD00;font-size:13px;letter-spacing:1px">LIONS CLUB IHEC CARTHAGE</div>' +
            '<div style="color:#fff;font-size:20px;font-weight:bold;margin-top:6px">' +
            'Choisis ton créneau d\'entretien</div>' +
          '</div>' +
          '<div style="padding:24px;color:#1F2937;font-size:14px;line-height:1.6">' +
            '<p>Bonjour ' + c.prenom + ',</p>' +
            '<p>Merci pour ta candidature ! Les horaires d\'entretien viennent d\'être finalisés.</p>' +
            '<p>Merci de cliquer sur le bouton ci-dessous pour <b>choisir ton créneau</b> parmi ceux ' +
            'disponibles.</p>' +
            '<p style="text-align:center;margin:26px 0">' +
              '<a href="' + lien + '" style="background:#00338D;color:#fff;text-decoration:none;' +
              'padding:12px 22px;border-radius:6px;display:inline-block">Choisir mon créneau</a>' +
            '</p>' +
            (lieu ? '<p>Les entretiens se dérouleront à : ' + lieu + '</p>' : '') +
            '<p style="color:#6B7280;font-size:12px">Ce lien est personnel, ne le partage pas.</p>' +
            '<p>À très bientôt,<br><b>L\'équipe du Lions Club IHEC Carthage</b></p>' +
          '</div>' +
        '</div>';

      var options = { htmlBody: html, name: 'Lions Club IHEC Carthage' };
      if (logo) options.inlineImages = { logo: logo };

      MailApp.sendEmail(c.email,
        'Choisis ton créneau d\'entretien — Lions Club IHEC Carthage', '', options);
      envoyes++;
    } catch (err) {}
  });

  ui.alert('Envoi terminé', envoyes + ' email(s) envoyé(s).', ui.ButtonSet.OK);
}

// ---------------------------------------------------------------------------
// RELANCE GÉNÉRALE : CONFIRMER OU MODIFIER SON CRÉNEAU
// ---------------------------------------------------------------------------

function relancerTousLesCandidats() {
  var ui = SpreadsheetApp.getUi();
  var f = onglet_('Candidats');
  var nb = f.getLastRow() - LIGNE_ENTETE;
  if (nb <= 0) return ui.alert('Aucun candidat.');

  var lignes = f.getRange(PREMIERE_LIGNE, 1, nb, C.fiche).getValues();
  var aRelancer = [];

  for (var i = 0; i < lignes.length; i++) {
    var id = texte_(lignes[i][C.id - 1]);
    var email = texte_(lignes[i][C.email - 1]);
    if (!id || !email) continue;
    if (texte_(lignes[i][C.presence - 1]) === 'Absent') continue;
    aRelancer.push({
      id: id,
      prenom: texte_(lignes[i][C.prenom - 1]),
      email: email,
      creneau: trouverCreneau_(texte_(lignes[i][C.creneau - 1]))
    });
  }

  if (!aRelancer.length) return ui.alert('Aucun candidat à relancer.');

  var reponse = ui.alert('Relancer les candidats',
    aRelancer.length + ' candidat(s) vont recevoir un email pour confirmer ou modifier ' +
    'leur créneau.\n\nConfirmer l\'envoi ?', ui.ButtonSet.YES_NO);
  if (reponse !== ui.Button.YES) return;

  var logo = logoDuClub_();
  var lieu = texte_(parametre_('Lieu des entretiens'));
  var envoyes = 0;

  aRelancer.forEach(function(c) {
    try {
      var lien = urlApplication_() + '?page=creneau&id=' + c.id + '&t=' + jeton_(c.id);
      var bloc = c.creneau
        ? '<div style="background:#F3F6FB;border-left:4px solid #FFCD00;padding:14px;margin:18px 0">' +
          '<div style="font-weight:bold;color:#00338D;margin-bottom:6px">Ton créneau actuel</div>' +
          '<div>' + c.creneau.date + ' à ' + c.creneau.heure +
          (c.creneau.salle ? '<br>' + c.creneau.salle : '') + '</div></div>'
        : '';

      var html =
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;' +
        'border:1px solid #E5E7EB;border-radius:10px;overflow:hidden">' +
          '<div style="background:#00338D;padding:20px;text-align:center">' +
            (logo ? '<img src="cid:logo" width="70" style="display:block;margin:auto 0 10px">' : '') +
            '<div style="color:#FFCD00;font-size:13px;letter-spacing:1px">LIONS CLUB IHEC CARTHAGE</div>' +
            '<div style="color:#fff;font-size:20px;font-weight:bold;margin-top:6px">' +
            'Confirme ton créneau</div>' +
          '</div>' +
          '<div style="padding:24px;color:#1F2937;font-size:14px;line-height:1.6">' +
            '<p>Bonjour ' + c.prenom + ',</p>' +
            '<p>Les horaires d\'entretien viennent d\'être finalisés. De nouveaux créneaux sont ' +
            'désormais disponibles.</p>' + bloc +
            '<p>Si ce créneau te convient, tu n\'as rien à faire. Sinon, clique ci-dessous pour ' +
            'en choisir un autre.</p>' +
            '<p style="text-align:center;margin:26px 0">' +
              '<a href="' + lien + '" style="background:#00338D;color:#fff;text-decoration:none;' +
              'padding:12px 22px;border-radius:6px;display:inline-block">Modifier mon créneau</a>' +
            '</p>' +
            (lieu ? '<p>Lieu des entretiens : ' + lieu + '</p>' : '') +
            '<p style="color:#6B7280;font-size:12px">Ce lien est personnel, ne le partage pas.</p>' +
            '<p>À très bientôt,<br><b>L\'équipe du Lions Club IHEC Carthage</b></p>' +
          '</div>' +
        '</div>';

      var options = { htmlBody: html, name: 'Lions Club IHEC Carthage' };
      if (logo) options.inlineImages = { logo: logo };

      MailApp.sendEmail(c.email,
        'Confirme ton créneau d\'entretien — Lions Club IHEC Carthage', '', options);
      envoyes++;
      Utilities.sleep(300);
    } catch (err) {}
  });

  ui.alert('Envoi terminé', envoyes + ' email(s) envoyé(s).', ui.ButtonSet.OK);
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

function testerEmailAcceptation() {
  envoyerEmailResultat_('Accepté', {
    prenom: 'Prénom',
    email: 'email@exemple.com',
    dept: 'Ressources Humaines'
  });
  Logger.log('Email de test envoyé');
}

function testerEmailRefus() {
  envoyerEmailResultat_('Refusé', {
    prenom: 'Prénom',
    email: 'email@exemple.com'
  });
  Logger.log('Email de refus envoyé');
}
