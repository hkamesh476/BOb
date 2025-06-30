from flask import Flask, render_template, request, redirect, url_for, session, flash
import requests
import json
import os

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'
API_URL = 'http://localhost:3001/api'  # Backend API URL
PASSWORDS_FILE = os.path.join(os.path.dirname(__file__), 'passwords.json')


def save_password_record(contact, password):
    # Save plain text password (no hashing)
    if '@' in contact:
        record = {"email": contact, "password": password}
    else:
        record = {"phone": contact, "password": password}
    # Load existing
    if os.path.exists(PASSWORDS_FILE):
        with open(PASSWORDS_FILE, 'r') as f:
            try:
                data = json.load(f)
            except Exception:
                data = []
    else:
        data = []
    # Remove any existing record for this contact
    data = [r for r in data if not (r.get('email') == contact or r.get('phone') == contact)]
    data.append(record)
    with open(PASSWORDS_FILE, 'w') as f:
        json.dump(data, f, indent=2)


@app.route('/')
def home():
    return render_template('home.html')

@app.route('/map')
def map_page():
    return render_template('map.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data = {
            'firstName': request.form['firstName'],
            'lastName': request.form['lastName'],
            'password': request.form['password'],
        }
        contact = request.form['contact']
        if '@' in contact:
            data['email'] = contact
        elif contact.isdigit() and len(contact) == 10:
            data['phone'] = contact
        # Save password to passwords.json
        save_password_record(contact, data['password'])
        resp = requests.post(f'{API_URL}/register', json=data)
        result = resp.json()
        if resp.ok:
            flash('Registration successful! Please log in.')
            return redirect(url_for('login'))
        else:
            flash(result.get('error', 'Registration failed.'))
    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        contact = request.form['contact']
        password = request.form['password']
        # Load users
        if os.path.exists(PASSWORDS_FILE):
            with open(PASSWORDS_FILE, 'r') as f:
                try:
                    data = json.load(f)
                except Exception:
                    data = []
        else:
            data = []
        # Find user
        user_record = None
        for r in data:
            if (r.get('email') == contact) or (r.get('phone') == contact):
                user_record = r
                break
        # Load role from users.json if possible
        user_role = 'buyer'
        try:
            with open(os.path.join(os.path.dirname(__file__), '../data/users.json'), 'r') as uf:
                users_data = json.load(uf)
                for u in users_data:
                    if contact and '@' in contact:
                        if u.get('email') == contact:
                            user_role = u.get('role', 'buyer')
                            break
                    elif contact and contact.isdigit() and len(contact) == 10:
                        if u.get('phone') == contact:
                            user_role = u.get('role', 'buyer')
                            break
        except Exception:
            pass
        if user_record and password == user_record['password']:
            # Simulate user object for session
            user = {'email': user_record.get('email'), 'phone': user_record.get('phone'), 'role': user_role, 'firstName': user_record.get('firstName', ''), 'tickets': user_record.get('tickets', 0)}
            session['user'] = user
            flash('Login successful!')
            if user_role == 'admin':
                return redirect(url_for('admin_dashboard'))
            elif user_role == 'seller':
                return redirect(url_for('seller_dashboard'))
            else:
                return redirect(url_for('dashboard'))
        else:
            flash('Login failed. Invalid credentials.')
    return render_template('login.html')

@app.route('/dashboard', methods=['GET', 'POST'])
def dashboard():
    user = session.get('user')
    if not user or user.get('role') != 'buyer':
        return redirect(url_for('login'))
    # Show feedback messages for forms
    spend_error = session.pop('spend_error', None)
    spend_success = session.pop('spend_success', None)
    grant_error = session.pop('grant_error', None)
    grant_success = session.pop('grant_success', None)
    sellername_error = session.pop('sellername_error', None)
    sellername_success = session.pop('sellername_success', None)
    promote_error = session.pop('promote_error', None)
    promote_success = session.pop('promote_success', None)
    sellers = []
    seller_names = {}
    logs = []
    seller_earnings = []
    if user.get('role') == 'admin':
        try:
            sellers = requests.get(f'{API_URL}/admin/sellers').json()
            seller_names = requests.get(f'{API_URL}/admin/seller-names').json()
            logs = requests.get(f'{API_URL}/admin/logs').json()
            # Compose seller earnings for table (name, code, earnings)
            for s in sellers:
                code = s.get('code')
                name = seller_names.get(code, '') if code else ''
                earnings = s.get('totalEarned', 0)
                seller_earnings.append({'name': name, 'code': code, 'earnings': earnings})
        except Exception:
            pass
    return render_template('dashboard.html', user=user,
        spend_error=spend_error, spend_success=spend_success,
        grant_error=grant_error, grant_success=grant_success,
        sellername_error=sellername_error, sellername_success=sellername_success,
        promote_error=promote_error, promote_success=promote_success,
        sellers=sellers, seller_names=seller_names, logs=logs, seller_earnings=seller_earnings)

@app.route('/admin-dashboard')
def admin_dashboard():
    user = session.get('user')
    print('DEBUG: Session user for admin-dashboard:', user)
    if not user:
        return redirect(url_for('login'))
    if user.get('role') != 'admin':
        return redirect(url_for('dashboard'))
    # Show admin dashboard with all context
    spend_error = session.pop('spend_error', None)
    spend_success = session.pop('spend_success', None)
    grant_error = session.pop('grant_error', None)
    grant_success = session.pop('grant_success', None)
    sellername_error = session.pop('sellername_error', None)
    sellername_success = session.pop('sellername_success', None)
    promote_error = session.pop('promote_error', None)
    promote_success = session.pop('promote_success', None)
    sellers = []
    seller_names = {}
    logs = []
    seller_earnings = []
    try:
        sellers = requests.get(f'{API_URL}/admin/sellers').json()
        seller_names = requests.get(f'{API_URL}/admin/seller-names').json()
        logs = requests.get(f'{API_URL}/admin/logs').json()
        for s in sellers:
            code = s.get('code')
            name = seller_names.get(code, '') if code else ''
            earnings = s.get('totalEarned', 0)
            seller_earnings.append({'name': name, 'code': code, 'earnings': earnings})
    except Exception:
        pass
    return render_template('admin_dashboard.html', user=user,
        spend_error=spend_error, spend_success=spend_success,
        grant_error=grant_error, grant_success=grant_success,
        sellername_error=sellername_error, sellername_success=sellername_success,
        promote_error=promote_error, promote_success=promote_success,
        sellers=sellers, seller_names=seller_names, logs=logs, seller_earnings=seller_earnings)

@app.route('/promote-admin', methods=['POST'])
def promote_admin():
    user = session.get('user')
    if not user or user.get('role') != 'admin':
        return redirect(url_for('dashboard'))
    contact = request.form.get('email')
    if not contact:
        session['promote_error'] = 'Email or phone is required.'
        return redirect(url_for('dashboard'))
    payload = {}
    if '@' in contact:
        payload['email'] = contact
    elif contact.isdigit() and len(contact) == 10:
        payload['phone'] = contact
    else:
        session['promote_error'] = 'Enter a valid email or 10-digit phone.'
        return redirect(url_for('dashboard'))
    try:
        resp = requests.post(f'{API_URL}/admin/promote', json=payload)
        result = resp.json()
        if resp.ok:
            session['promote_success'] = 'User promoted to admin.'
        else:
            session['promote_error'] = result.get('error', 'Failed to promote user.')
    except Exception as e:
        session['promote_error'] = f'Error: {e}'
    return redirect(url_for('dashboard'))

# Forgot password flow
@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    code_sent = False
    error = None
    if request.method == 'POST':
        email = request.form.get('email')
        try:
            resp = requests.post(f'{API_URL}/forgot-password', json={'email': email})
            result = resp.json()
            if resp.ok:
                code_sent = True
                flash('A reset code has been sent to the admin. Contact admin for the code.')
                return redirect(url_for('reset_password', email=email))
            else:
                error = result.get('error', 'Failed to send reset code.')
        except Exception as e:
            error = f'Error: {e}'
    return render_template('forgot_password.html', error=error)

@app.route('/reset-password', methods=['GET', 'POST'])
def reset_password():
    email = request.args.get('email') or request.form.get('email')
    error = None
    success = None
    if request.method == 'POST':
        code = request.form.get('code')
        new_password = request.form.get('new_password')
        try:
            resp = requests.post(f'{API_URL}/reset-password', json={'email': email, 'code': code, 'newPassword': new_password})
            result = resp.json()
            if resp.ok:
                success = 'Password reset successful! You can now log in.'
            else:
                error = result.get('error', 'Failed to reset password.')
        except Exception as e:
            error = f'Error: {e}'
    return render_template('reset_password.html', email=email, error=error, success=success)

# Buyer: Spend tickets
@app.route('/spend-tickets', methods=['POST'])
def spend_tickets():
    user = session.get('user')
    if not user or user.get('role') != 'buyer':
        return redirect(url_for('dashboard'))
    code = request.form.get('code')
    amount = request.form.get('amount')
    try:
        amount = int(amount)
    except:
        amount = 0
    payload = {'buyerId': user.get('email') or user.get('phone'), 'code': code, 'amount': amount}
    try:
        resp = requests.post(f'{API_URL}/buyer/spend', json=payload)
        result = resp.json()
        if resp.ok:
            # Update user tickets in session
            user['tickets'] = result.get('buyerTickets', user.get('tickets'))
            session['user'] = user
            session['spend_success'] = result.get('message', 'Tickets spent!')
        else:
            session['spend_error'] = result.get('error', 'Failed to spend tickets.')
    except Exception as e:
        session['spend_error'] = f'Error: {e}'
    return redirect(url_for('dashboard'))

# Admin: Grant tickets
@app.route('/grant-tickets', methods=['POST'])
def grant_tickets():
    user = session.get('user')
    if not user or user.get('role') != 'admin':
        return redirect(url_for('dashboard'))
    contact = request.form.get('buyer_contact')
    amount = request.form.get('amount')
    try:
        amount = int(amount)
    except:
        amount = 0
    payload = {'amount': amount}
    if '@' in contact:
        payload['buyerEmail'] = contact
    elif contact.isdigit() and len(contact) == 10:
        payload['buyerPhone'] = contact
    else:
        session['grant_error'] = 'Invalid contact.'
        return redirect(url_for('dashboard'))
    try:
        resp = requests.post(f'{API_URL}/admin/generate-tickets', json=payload)
        result = resp.json()
        if resp.ok:
            session['grant_success'] = 'Tickets granted!'
        else:
            session['grant_error'] = result.get('error', 'Failed to grant tickets.')
    except Exception as e:
        session['grant_error'] = f'Error: {e}'
    return redirect(url_for('dashboard'))

# Admin: Set seller name
@app.route('/set-seller-name', methods=['POST'])
def set_seller_name():
    user = session.get('user')
    if not user or user.get('role') != 'admin':
        return redirect(url_for('dashboard'))
    code = request.form.get('code')
    name = request.form.get('name')
    payload = {'code': code, 'name': name}
    try:
        resp = requests.post(f'{API_URL}/admin/seller-names', json=payload)
        result = resp.json()
        if resp.ok:
            session['sellername_success'] = 'Seller name set!'
        else:
            session['sellername_error'] = result.get('error', 'Failed to set seller name.')
    except Exception as e:
        session['sellername_error'] = f'Error: {e}'
    return redirect(url_for('dashboard'))

@app.route('/transactions')
def transactions():
    user = session.get('user')
    transactions = []
    error = None
    try:
        resp = requests.get(f'{API_URL}/admin/logs')
        if resp.ok:
            logs = resp.json()
            # Only show spend-tickets actions for now
            transactions = [l for l in logs if l.get('action') == 'spend-tickets']
        else:
            error = 'Could not fetch transactions.'
    except Exception as e:
        error = f'Error: {e}'
    return render_template('transactions.html', user=user, transactions=transactions, error=error)

@app.route('/logout')
def logout():
    session.clear()
    flash('Logged out successfully.')
    return redirect(url_for('home'))

if __name__ == '__main__':
    app.run(debug=True, port=3000)
