document.addEventListener('DOMContentLoaded', () => {

    const { jsPDF } = window.jspdf;

    const firebaseConfig = {
        apiKey: "AIzaSyDLIDMYQfoFMtOjs7SGXK2TCrXzbdSZm0s",
        authDomain: "eupisi-ooo.firebaseapp.com",
        projectId: "eupisi-ooo",
        storageBucket: "eupisi-ooo.firebasestorage.app",
        messagingSenderId: "315497257012",
        appId: "1:315497257012:web:88b18304b0ec4d2addd261",
    };
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    const loadingSpinner = document.getElementById('loading-spinner');
    const loginView = document.getElementById('login-view');
    const userView = document.getElementById('user-view');
    const adminView = document.getElementById('admin-view');
    const logoutContainer = document.getElementById('logout-container');
    const userEmailDisplay = document.getElementById('user-email-display');
    const logoutButton = document.getElementById('logout-button');
    const detaljiModal = new bootstrap.Modal(document.getElementById('prijavaDetaljiModal'));

    const ADMIN_UID = 'ijkviUSsFCXIK2U1RTn7wzQ7S9E2';

    const STATUSI = {
        predano: { text: "Predano", color: "secondary" },
        verifikacija: { text: "Čeka verifikaciju", color: "warning" },
        ver_prihvacena: { text: "Upisnica Prihvaćena", color: "info" },
        ver_odbijena: { text: "Upisnica Odbijena", color: "danger" },
        u_tijeku: { text: "Program u tijeku", color: "primary" },
        zavrseno: { text: "Program završen", color: "success" },
        prekinuto: { text: "Program prekinut", color: "dark" },
    };
    const PARALELNI_STATUSI = ['u_tijeku', 'zavrseno', 'prekinuto'];

    function showView(viewId) {
        loadingSpinner.classList.add('d-none');
        [loginView, userView, adminView].forEach(el => el.classList.add('d-none'));
        const viewToShow = document.getElementById(viewId);
        if (viewToShow) viewToShow.classList.remove('d-none');
        logoutContainer.classList.toggle('d-none', viewId === 'login-view' || !auth.currentUser);
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            userEmailDisplay.textContent = user.email;
            if (user.uid === ADMIN_UID) { showView('admin-view'); renderAdminDashboard(); }
            else { showView('user-view'); renderUserDashboard(user.uid); }
        } else {
            userEmailDisplay.textContent = '';
            showView('login-view');
            renderLoginView();
        }
    });

    logoutButton.addEventListener('click', () => auth.signOut());

    function renderLoginView() {
        loginView.innerHTML = `<div class="row justify-content-center"><div class="col-md-6 col-lg-5"><div class="content-card"><h2 class="card-title-custom"><i class="bi bi-box-arrow-in-right me-2"></i>Prijava</h2><form id="login-form"><div class="form-floating mb-3"><input type="email" class="form-control" id="login-email" placeholder="email@primjer.com" required><label for="login-email">Email adresa</label></div><div class="form-floating mb-3"><input type="password" class="form-control" id="login-password" placeholder="Lozinka" required><label for="login-password">Lozinka</label></div><div id="login-error" class="alert alert-danger d-none mt-3"></div><button type="submit" class="btn btn-primary w-100 btn-lg mt-3">Prijavi se</button></form></div></div></div>`;
        document.getElementById('login-form').addEventListener('submit', (e) => { e.preventDefault(); const email = document.getElementById('login-email').value; const password = document.getElementById('login-password').value; auth.signInWithEmailAndPassword(email, password).catch(error => { document.getElementById('login-error').textContent = 'Pogrešni podaci za pristup.'; document.getElementById('login-error').classList.remove('d-none'); }); });
    }

    async function renderUserDashboard(userId) {
        const q = db.collection('upisnice').where('userId', '==', userId).orderBy('datumPredaje', 'desc');
        const querySnapshot = await q.get();
        if (querySnapshot.empty) {
            await showPrijavaForm("Obrazac za Prijavu");
        } else {
            let content = '<h2 class="card-title-custom">Moje Prijave</h2>';
            const imaAktivnuPrijavu = querySnapshot.docs.some(doc => !['ver_odbijena'].includes(doc.data().status));
            const mozePrijavitiParalelni = querySnapshot.docs.some(doc => PARALELNI_STATUSI.includes(doc.data().status));
            querySnapshot.forEach(doc => {
                const prijava = doc.data();
                const statusInfo = STATUSI[prijava.status] || { text: prijava.status, color: "secondary" };
                content += `<div class="content-card status-card border-${statusInfo.color} mb-4"><div class="d-flex justify-content-between align-items-center flex-wrap gap-2"><div><p class="text-muted mb-1">Program</p><h4 class="mb-0 fw-bold">${prijava.zeljeniProgram}</h4></div><div class="text-end"><p class="text-muted mb-1">Status</p><span class="badge fs-6 rounded-pill text-bg-${statusInfo.color}">${statusInfo.text}</span></div></div>${prijava.razlogOdbijanja ? `<hr class="my-3"><p class="mb-0"><strong class="text-danger">Razlog odbijanja:</strong> ${prijava.razlogOdbijanja}</p>` : ''}</div>`;
            });
            if (!imaAktivnuPrijavu || mozePrijavitiParalelni) {
                content += `<div class="text-center mt-5"><button id="nova-prijava-btn" class="btn btn-lg btn-primary"><i class="bi bi-plus-circle me-2"></i> ${mozePrijavitiParalelni ? 'Prijavi Paralelni Program' : 'Podnesi Novu Prijavu'}</button></div>`;
            }
            userView.innerHTML = content;
            const novaPrijavaBtn = document.getElementById('nova-prijava-btn');
            if (novaPrijavaBtn) {
                novaPrijavaBtn.addEventListener('click', () => showPrijavaForm(mozePrijavitiParalelni ? "Prijava za Paralelni Program" : "Novi Obrazac za Prijavu"));
            }
        }
    }
    
    async function showPrijavaForm(naslovForme) {
        const programiSnapshot = await db.collection('programi').orderBy('naziv').get();
        const programiOptions = programiSnapshot.docs.map(doc => `<option value="${doc.data().naziv}">${doc.data().naziv}</option>`).join('');
        userView.innerHTML = `<div class="row justify-content-center"><div class="col-lg-10"><form id="upisnica-form" class="content-card"><h2 class="card-title-custom">${naslovForme}</h2><div class="row g-3">` +
            `<div class="col-md-6"><div class="form-floating"><input type="text" id="ime" class="form-control" placeholder="Ime" required><label for="ime">Ime</label></div></div><div class="col-md-6"><div class="form-floating"><input type="text" id="prezime" class="form-control" placeholder="Prezime" required><label for="prezime">Prezime</label></div></div>` +
            `<div class="col-md-6"><div class="form-floating"><input type="text" id="oib" class="form-control" placeholder="OIB" required minlength="11" maxlength="11"><label for="oib">OIB</label></div></div><div class="col-md-6"><div class="form-floating"><input type="date" id="datum-rodjenja" class="form-control" placeholder="Datum rođenja" required><label for="datum-rodjenja">Datum rođenja</label></div></div>` +
            `<div class="col-12"><div class="form-floating"><input type="text" id="adresa" class="form-control" placeholder="Adresa" required><label for="adresa">Adresa</label></div></div><div class="col-md-6"><div class="form-floating"><input type="text" id="mjesto-stanovanja" class="form-control" placeholder="Mjesto stanovanja" required><label for="mjesto-stanovanja">Mjesto stanovanja</label></div></div>` +
            `<div class="col-md-6"><div class="form-floating"><input type="text" id="mjesto-rodjenja" class="form-control" placeholder="Mjesto rođenja" required><label for="mjesto-rodjenja">Mjesto rođenja</label></div></div><div class="col-md-4"><div class="form-floating"><input type="text" id="br-osobne" class="form-control" placeholder="Broj osobne" required><label for="br-osobne">Broj osobne iskaznice</label></div></div>` +
            `<div class="col-md-4"><div class="form-floating"><input type="email" id="email" class="form-control" placeholder="Email" value="${auth.currentUser.email}" required><label for="email">E-mail</label></div></div><div class="col-md-4"><div class="form-floating"><input type="tel" id="mobitel" class="form-control" placeholder="Broj mobitela" required><label for="mobitel">Broj mobitela</label></div></div>` +
            `<div class="col-md-6"><div class="form-floating"><select id="skolovanje" class="form-select" required><option value="" selected disabled>Odaberite...</option><option value="OŠ">OŠ</option><option value="NKV">NKV</option><option value="NKS">NKS</option><option value="SSS">SSS</option><option value="SŠS">SŠS</option><option value="VSS">VSS</option><option value="VSŠ">VSŠ</option></select><label for="skolovanje">Dosadašnje školovanje</label></div></div>` +
            `<div class="col-md-6"><div class="form-floating"><select id="zeljeni-program" class="form-select" required><option value="" selected disabled>Odaberite...</option>${programiOptions}</select><label for="zeljeni-program">Željeni program</label></div></div>` +
            `<div class="col-12"><div class="form-floating"><textarea id="razlog" class="form-control" placeholder="Razlog (opcionalno)" style="height: 100px"></textarea><label for="razlog">Razlog (opcionalno)</label></div></div>` +
            `</div><button type="submit" class="btn btn-primary w-100 btn-lg mt-4">Pošalji prijavu</button></form></div></div>`;
        document.getElementById('upisnica-form').addEventListener('submit', handleUpisnicaSubmit);
    }

    window.handleUpisnicaSubmit = async function(e) { e.preventDefault(); const currentUser = auth.currentUser; if (!currentUser) return; const form = e.target; const prijavaData = { userId: currentUser.uid, status: 'predano', datumPredaje: firebase.firestore.FieldValue.serverTimestamp(), ime: form.querySelector('#ime').value, prezime: form.querySelector('#prezime').value, oib: form.querySelector('#oib').value, datumRodjenja: form.querySelector('#datum-rodjenja').value, adresa: form.querySelector('#adresa').value, mjestoStanovanja: form.querySelector('#mjesto-stanovanja').value, mjestoRodjenja: form.querySelector('#mjesto-rodjenja').value, brojOsobne: form.querySelector('#br-osobne').value, email: form.querySelector('#email').value, mobitel: form.querySelector('#mobitel').value, skolovanje: form.querySelector('#skolovanje').value, zeljeniProgram: form.querySelector('#zeljeni-program').value, razlog: form.querySelector('#razlog').value, }; try { await db.collection('upisnice').add(prijavaData); alert('Prijava uspješno poslana!'); renderUserDashboard(currentUser.uid); } catch (error) { console.error(error); alert('Došlo je do greške.'); } }

    function renderAdminDashboard() {
        adminView.innerHTML = `<div class="row"><div class="col-lg-8 mb-4"><div class="content-card"><h3 class="card-title-custom">Pristigle Prijave</h3><div class="table-wrapper"><table class="table table-hover align-middle"><thead><tr><th>Kandidat</th><th>Program</th><th>Datum</th><th>Status</th></tr></thead><tbody id="prijave-table-body"></tbody></table></div></div></div><div class="col-lg-4 mb-4"><div class="content-card"><h3 class="card-title-custom">Programi</h3><form id="program-form" class="mb-3"><div class="input-group"><input type="text" id="novi-program-naziv" class="form-control" placeholder="Naziv programa" required><button class="btn btn-primary" type="submit"><i class="bi bi-plus-lg"></i></button></div></form><ul id="programi-list" class="list-group"></ul></div></div></div>`;
        document.getElementById('program-form').addEventListener('submit', async (e) => { e.preventDefault(); const nazivInput = document.getElementById('novi-program-naziv'); if (nazivInput.value.trim() === '') return; try { await db.collection('programi').add({ naziv: nazivInput.value.trim() }); nazivInput.value = ''; } catch (error) { alert('Greška pri dodavanju programa.'); } });
        db.collection('programi').orderBy('naziv').onSnapshot(snapshot => document.getElementById('programi-list').innerHTML = snapshot.docs.map(doc => `<li class="list-group-item">${doc.data().naziv}</li>`).join(''));
        db.collection('upisnice').orderBy('datumPredaje', 'desc').onSnapshot(snapshot => {
            const tbody = document.getElementById('prijave-table-body');
            if (snapshot.empty) { tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted p-5">Nema prijava.</td></tr>'; return; }
            tbody.innerHTML = snapshot.docs.map(doc => { const prijava = doc.data(); const statusInfo = STATUSI[prijava.status] || { text: prijava.status, color: "dark" }; return `<tr onclick="showPrijavaDetalji('${doc.id}')"><td><strong>${prijava.ime} ${prijava.prezime}</strong><br><small class="text-muted">${prijava.email}</small></td><td>${prijava.zeljeniProgram}</td><td>${prijava.datumPredaje ? prijava.datumPredaje.toDate().toLocaleDateString('hr-HR') : '-'}</td><td><span class="badge rounded-pill text-bg-${statusInfo.color}">${statusInfo.text}</span></td></tr>`; }).join('');
        });
    }

    window.showPrijavaDetalji = async function(prijavaId) {
        const docRef = db.collection('upisnice').doc(prijavaId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) { alert('Prijava nije pronađena!'); return; }
        const prijava = docSnap.data();
        document.getElementById('prijavaDetaljiModalLabel').textContent = `Detalji za: ${prijava.ime} ${prijava.prezime}`;
        document.getElementById('modal-body-content').innerHTML = `
            <div class="row g-4">
                <div class="col-md-6"><div class="detail-label">OIB</div><div class="detail-value">${prijava.oib}</div></div>
                <div class="col-md-6"><div class="detail-label">Datum Rođenja</div><div class="detail-value">${new Date(prijava.datumRodjenja).toLocaleDateString('hr-HR')}</div></div>
                <div class="col-12"><div class="detail-label">Adresa</div><div class="detail-value">${prijava.adresa}, ${prijava.mjestoStanovanja}</div></div>
                <div class="col-md-6"><div class="detail-label">Email</div><div class="detail-value">${prijava.email}</div></div>
                <div class="col-md-6"><div class="detail-label">Mobitel</div><div class="detail-value">${prijava.mobitel}</div></div>
                <div class="col-md-6"><div class="detail-label">Stručna Sprema</div><div class="detail-value">${prijava.skolovanje}</div></div>
                <div class="col-md-6"><div class="detail-label">Željeni Program</div><div class="detail-value fw-bold text-primary">${prijava.zeljeniProgram}</div></div>
                ${prijava.razlog ? `<div class="col-12"><div class="detail-label">Razlog prijave</div><div class="detail-value fst-italic">"${prijava.razlog}"</div></div>` : ''}
            </div>
            <hr class="my-4">
            <div id="rejection-section" style="display: none;">
                <label for="razlog-odbijanja" class="form-label fw-bold">Unesite razlog odbijanja:</label>
                <textarea class="form-control" id="razlog-odbijanja" rows="2"></textarea>
                <button class="btn btn-danger mt-2" onclick="updateStatus('${prijavaId}', 'ver_odbijena', true)">Potvrdi Odbijanje</button>
            </div>`;
        
        let footerHTML = '';
        if (prijava.status === 'predano') { footerHTML = `<button class="btn btn-warning" onclick="updateStatus('${prijavaId}', 'verifikacija')">Stavi na verifikaciju</button>`; }
        else if (prijava.status === 'verifikacija') { footerHTML = `<button class="btn btn-info" onclick="updateStatus('${prijavaId}', 'ver_prihvacena')">Prihvati upisnicu</button><button class="btn btn-outline-danger" onclick="document.getElementById('rejection-section').style.display='block';">Odbij upisnicu</button>`; }
        else if (prijava.status === 'ver_prihvacena') { footerHTML = `<button class="btn btn-success" onclick="generateConfirmationPDF('${prijavaId}')"><i class="bi bi-file-earmark-pdf-fill me-2"></i>Generiraj Potvrdu</button><button class="btn btn-primary" onclick="updateStatus('${prijavaId}', 'u_tijeku')">Pokreni program</button>`; }
        else if (prijava.status === 'u_tijeku') { footerHTML = `<button class="btn btn-success" onclick="updateStatus('${prijavaId}', 'zavrseno')">Označi kao Završeno</button><button class="btn btn-secondary" onclick="updateStatus('${prijavaId}', 'prekinuto')">Označi kao Prekinuto</button>`; }
        else if (prijava.status === 'ver_odbijena') { footerHTML = `<p class="text-danger m-0">Prijava je odbijena. Zatvorite prozor.</p>` }
        
        footerHTML += `<button type="button" class="btn btn-light ms-auto" data-bs-dismiss="modal">Zatvori</button>`;
        document.getElementById('modal-footer-content').innerHTML = `<div class="d-flex flex-wrap gap-2 w-100">${footerHTML}</div>`;
        detaljiModal.show();
    }

    window.updateStatus = (id, status, withReason = false) => {
        const dataToUpdate = { status };
        if (withReason) {
            const reason = document.getElementById('razlog-odbijanja').value;
            if (!reason) { alert('Molimo unesite razlog odbijanja.'); return; }
            dataToUpdate.razlogOdbijanja = reason;
        } else {
            dataToUpdate.razlogOdbijanja = firebase.firestore.FieldValue.delete();
        }
        db.collection('upisnice').doc(id).update(dataToUpdate)
            .then(() => detaljiModal.hide())
            .catch(error => console.error("Greška pri ažuriranju statusa: ", error));
    };

    window.generateConfirmationPDF = async function(prijavaId) {
        const docRef = db.collection('upisnice').doc(prijavaId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) { alert('Greška: Prijava nije pronađena.'); return; }
        const prijava = docSnap.data();
        const doc = new jsPDF();
        doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.text("POTVRDA O UPISU", 105, 25, { align: "center" });
        doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text(`Ovom potvrdnicom potvrđuje se da je polaznik/ca`, 20, 50);
        doc.setFont("helvetica", "bold"); doc.text(`${prijava.ime} ${prijava.prezime}`, 20, 60);
        doc.setFont("helvetica", "normal"); doc.text(`(OIB: ${prijava.oib}, rođen/a: ${new Date(prijava.datumRodjenja).toLocaleDateString('hr-HR')})`, 20, 70);
        doc.text(`uspješno upisan/a u program obrazovanja odraslih:`, 20, 85);
        doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text(prijava.zeljeniProgram, 105, 100, { align: "center" });
        doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text("Potvrda se izdaje na zahtjev polaznika/ce i služi kao dokaz o upisu.", 20, 130);
        doc.text(`Ustanova za obrazovanje odraslih e-Upisnice`, 20, 180);
        doc.text(`U ____________, dana ${new Date().toLocaleDateString('hr-HR')}`, 20, 210);
        doc.line(130, 240, 190, 240); doc.text("Potpis odgovorne osobe", 135, 245);
        doc.save(`Potvrda_o_upisu_${prijava.prezime}_${prijava.ime}.pdf`);
        await docRef.update({ potvrdaIzdana: true, datumIzdavanjaPotvrde: firebase.firestore.FieldValue.serverTimestamp() });
    };
});