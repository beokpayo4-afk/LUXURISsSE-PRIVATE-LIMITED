"""Seed local tickets for every Indian state / UT (SAMPLE indicative routes)."""

from __future__ import annotations

from datetime import date, time, timedelta
from decimal import Decimal

from sqlalchemy import func, select

from app.db.session import get_session_factory
from app.models.tickets import Ticket

# state, city/hub, from, to, pickup, drop, type, price
LOCAL_ROUTES: list[tuple[str, str, str, str, str, str, str, int]] = [
    # Andaman and Nicobar Islands
    ("Andaman and Nicobar Islands", "Port Blair", "Aberdeen Bazaar", "Cellular Jail", "Aberdeen Stand", "Jail Gate", "Local Bus", 25),
    ("Andaman and Nicobar Islands", "Port Blair", "Marina Park", "Corbyn's Cove", "Marina Jetty", "Corbyn's Cove Beach", "Tempo", 80),
    ("Andaman and Nicobar Islands", "Port Blair", "Junglighat", "Chatham Island", "Junglighat Jetty", "Chatham Saw Mill", "Local Bus", 20),
    # Andhra Pradesh
    ("Andhra Pradesh", "Vijayawada", "Vijayawada Bus Stand", "Undavalli Caves", "Pandit Nehru Bus Station", "Undavalli Gate", "Local Bus", 40),
    ("Andhra Pradesh", "Visakhapatnam", "RTC Complex", "RK Beach", "RTC Complex Gate", "Beach Road", "Local Bus", 25),
    ("Andhra Pradesh", "Tirupati", "Tirupati Bus Stand", "Alipiri", "Central Bus Stand", "Alipiri Footpath", "Tempo", 50),
    # Arunachal Pradesh
    ("Arunachal Pradesh", "Itanagar", "Itanagar Market", "Ganga Lake", "IG Park", "Ganga Lake Jetty", "Tempo", 80),
    ("Arunachal Pradesh", "Itanagar", "Naharlagun", "Ita Fort", "Naharlagun Stand", "Ita Fort Gate", "Local Bus", 35),
    ("Arunachal Pradesh", "Tawang", "Tawang Market", "Tawang Monastery", "Main Market", "Monastery Gate", "Tempo", 60),
    # Assam
    ("Assam", "Guwahati", "Paltan Bazaar", "Kamakhya Temple", "ASTC Paltan Bazaar", "Kamakhya Gate", "Local Bus", 30),
    ("Assam", "Guwahati", "Fancy Bazaar", "Umananda Island Jetty", "Fancy Bazaar Stand", "Kachari Ghat", "E-Rickshaw", 40),
    ("Assam", "Kaziranga", "Kohora", "Kaziranga Range", "Kohora Market", "Central Range Gate", "Tempo", 120),
    # Bihar
    ("Bihar", "Patna", "Patna Junction", "Gandhi Maidan", "Patna Junction Gate 1", "Gandhi Maidan Circle", "E-Rickshaw", 40),
    ("Bihar", "Patna", "Patna Sahib", "Golghar", "Patna Sahib Stand", "Golghar Gate", "Local Bus", 25),
    ("Bihar", "Bodh Gaya", "Bodh Gaya Bus Stand", "Mahabodhi Temple", "Bus Stand", "Temple Complex", "E-Rickshaw", 30),
    # Chandigarh
    ("Chandigarh", "Chandigarh", "Sector 17", "Rock Garden", "Sector 17 Plaza", "Rock Garden Entry", "Local Bus", 20),
    ("Chandigarh", "Chandigarh", "ISBT Sector 17", "Sukhna Lake", "ISBT Gate", "Lake Promenade", "Local Bus", 25),
    ("Chandigarh", "Chandigarh", "Sector 43", "Elante Mall", "Sector 43 Stand", "Elante Entrance", "E-Rickshaw", 40),
    # Chhattisgarh
    ("Chhattisgarh", "Raipur", "Railway Station", "Telibandha Lake", "Raipur Junction", "Telibandha Chowk", "Local Bus", 25),
    ("Chhattisgarh", "Raipur", "Pandri Market", "Magneto Mall", "Pandri Bus Stop", "Magneto Entrance", "E-Rickshaw", 40),
    ("Chhattisgarh", "Raipur", "Telghani Naka", "Purkhauti Muktangan", "Kamal Super Bazar", "Muktangan Gate", "Local Bus", 30),
    ("Chhattisgarh", "Bilaspur", "Bilaspur Station", "High Court", "Station Stand", "High Court Gate", "Local Bus", 25),
    ("Chhattisgarh", "Jagdalpur", "Jagdalpur Market", "Chitrakote Falls", "Main Market", "Falls Parking", "Tempo", 150),
    # Delhi
    ("Delhi", "New Delhi", "Kashmere Gate", "India Gate", "Kashmere Gate ISBT", "India Gate Circle", "Local Bus", 20),
    ("Delhi", "New Delhi", "Botanical Garden", "New Delhi Railway Station", "Botanical Garden Metro", "NDLS Gate", "Local Bus", 50),
    ("Delhi", "New Delhi", "Connaught Place", "Red Fort", "CP Outer Circle", "Lal Qila Gate", "Local Bus", 20),
    ("Delhi", "New Delhi", "Saket", "Qutub Minar", "Saket Metro", "Qutub Complex", "Tempo", 80),
    # Goa
    ("Goa", "Panaji", "Panaji Kadamba", "Miramar Beach", "Kadamba Stand", "Miramar Circle", "Local Bus", 20),
    ("Goa", "Panaji", "Panaji Church", "Dona Paula", "Church Square", "Dona Paula Jetty", "Local Bus", 25),
    ("Goa", "Calangute", "Calangute Market", "Baga Beach", "Market Stand", "Baga Circle", "Tempo", 40),
    # Gujarat
    ("Gujarat", "Ahmedabad", "Kalupur Station", "Sabarmati Ashram", "Kalupur Gate", "Ashram Road", "Local Bus", 25),
    ("Gujarat", "Ahmedabad", "Law Garden", "Kankaria Lake", "Law Garden Stand", "Kankaria Gate", "Local Bus", 20),
    ("Gujarat", "Vadodara", "Vadodara Station", "Laxmi Vilas Palace", "Station Stand", "Palace Gate", "E-Rickshaw", 40),
    # Haryana
    ("Haryana", "Gurugram", "Cyber Hub", "HUDA City Centre", "Cyber Hub Gate", "Metro Exit", "Tempo", 60),
    ("Haryana", "Gurugram", "MG Road", "Ambience Mall", "MG Road Metro", "Ambience Entrance", "Local Bus", 30),
    ("Haryana", "Faridabad", "Old Faridabad", "Badkhal Lake", "Old FB Stand", "Lake Entry", "Local Bus", 35),
    # Himachal Pradesh
    ("Himachal Pradesh", "Shimla", "Shimla Mall Road", "Jakhoo Temple", "Scandal Point", "Jakhoo Base", "Local Bus", 35),
    ("Himachal Pradesh", "Shimla", "ISBT Shimla", "The Ridge", "ISBT Gate", "Ridge Circle", "Local Bus", 25),
    ("Himachal Pradesh", "Manali", "Manali Mall Road", "Hadimba Temple", "Mall Road Stand", "Temple Gate", "Tempo", 50),
    # Jammu and Kashmir
    ("Jammu and Kashmir", "Srinagar", "Lal Chowk", "Dal Lake", "Lal Chowk Stand", "Boulevard Road", "Local Bus", 30),
    ("Jammu and Kashmir", "Srinagar", "Dal Gate", "Shankaracharya Temple", "Dal Gate Stand", "Temple Base", "Tempo", 80),
    ("Jammu and Kashmir", "Jammu", "Jammu Station", "Raghunath Temple", "Station Stand", "Temple Gate", "Local Bus", 25),
    # Jharkhand
    ("Jharkhand", "Ranchi", "Ranchi Station", "Rock Garden", "Station Stand", "Rock Garden Gate", "Local Bus", 30),
    ("Jharkhand", "Ranchi", "Main Road", "Tagore Hill", "Main Road Stand", "Tagore Hill Base", "Tempo", 50),
    ("Jharkhand", "Jamshedpur", "Jubilee Park", "Dimna Lake", "Jubilee Gate", "Dimna Entry", "Local Bus", 40),
    # Karnataka
    ("Karnataka", "Bengaluru", "Majestic", "Cubbon Park", "Kempegowda Bus Station", "Cubbon Park Gate", "Local Bus", 25),
    ("Karnataka", "Bengaluru", "MG Road", "Lalbagh", "MG Road Metro", "Lalbagh West Gate", "Local Bus", 30),
    ("Karnataka", "Mysuru", "Mysuru Bus Stand", "Mysore Palace", "City Bus Stand", "Palace North Gate", "Local Bus", 20),
    # Kerala
    ("Kerala", "Kochi", "Ernakulam Jetty", "Fort Kochi", "Boat Jetty", "Fort Kochi Beach", "Local Bus", 30),
    ("Kerala", "Kochi", "MG Road Kochi", "Marine Drive", "MG Road Stand", "Marine Drive Walkway", "Local Bus", 20),
    ("Kerala", "Thiruvananthapuram", "East Fort", "Kovalam Beach", "East Fort Stand", "Lighthouse Beach", "Tempo", 80),
    # Ladakh
    ("Ladakh", "Leh", "Leh Main Bazaar", "Shanti Stupa", "Main Bazaar", "Shanti Stupa Base", "Tempo", 80),
    ("Ladakh", "Leh", "Leh Airport", "Leh Market", "Airport Stand", "Main Market", "Tempo", 150),
    ("Ladakh", "Leh", "Leh Palace", "Magnetic Hill Road", "Palace Base", "Magnetic Hill Sign", "Tempo", 200),
    # Madhya Pradesh
    ("Madhya Pradesh", "Bhopal", "Habibganj", "Upper Lake", "Habibganj Stand", "Boat Club", "Local Bus", 25),
    ("Madhya Pradesh", "Bhopal", "New Market", "Van Vihar", "New Market Stand", "Van Vihar Gate", "Local Bus", 30),
    ("Madhya Pradesh", "Indore", "Rajwada", "Sarafa Bazaar", "Rajwada Circle", "Sarafa Entry", "E-Rickshaw", 30),
    # Maharashtra
    ("Maharashtra", "Mumbai", "CST", "Gateway of India", "CST Stand", "Apollo Bunder", "Local Bus", 20),
    ("Maharashtra", "Mumbai", "Bandra Station", "Bandstand", "Bandra West Exit", "Bandstand Promenade", "Local Bus", 25),
    ("Maharashtra", "Pune", "Shivaji Nagar", "Shaniwar Wada", "Shivaji Nagar Stand", "Wada Gate", "Local Bus", 20),
    ("Maharashtra", "Nagpur", "Sitabuldi", "Deekshabhoomi", "Sitabuldi Stand", "Deekshabhoomi Gate", "Local Bus", 25),
    # Manipur
    ("Manipur", "Imphal", "Imphal Market", "Kangla Fort", "Khwairamband Bazaar", "Kangla Gate", "Tempo", 40),
    ("Manipur", "Imphal", "ISBT Imphal", "Ima Market", "ISBT Gate", "Ima Keithel", "Local Bus", 25),
    ("Manipur", "Imphal", "Airport Road", "Loktak Viewpoint Road", "Airport Stand", "Loktak Entry Road", "Tempo", 120),
    # Meghalaya
    ("Meghalaya", "Shillong", "Police Bazaar", "Elephant Falls", "PB Stand", "Elephant Falls Entry", "Local Bus", 50),
    ("Meghalaya", "Shillong", "Laitumkhrah", "Ward's Lake", "Laitumkhrah Stand", "Ward's Lake Gate", "Local Bus", 30),
    ("Meghalaya", "Cherrapunji", "Cherrapunji Market", "Nohkalikai Falls", "Market Stand", "Falls Viewpoint", "Tempo", 100),
    # Mizoram
    ("Mizoram", "Aizawl", "Aizawl Bazaar", "Durtlang Hills", "Bara Bazaar", "Durtlang View", "Tempo", 60),
    ("Mizoram", "Aizawl", "Zarkawt", "Solomon's Temple", "Zarkawt Stand", "Temple Gate", "Local Bus", 35),
    ("Mizoram", "Aizawl", "Millennium Centre", "Reiek Viewpoint Road", "Millennium Stand", "Reiek Base Road", "Tempo", 150),
    # Nagaland
    ("Nagaland", "Kohima", "Kohima Town", "War Cemetery", "Main Town Stand", "Cemetery Gate", "Local Bus", 30),
    ("Nagaland", "Kohima", "Nagas Hotel Area", "Kisama Heritage Village", "Hotel Area Stand", "Kisama Gate", "Tempo", 80),
    ("Nagaland", "Dimapur", "Dimapur Station", "City Tower", "Station Stand", "City Tower Circle", "Local Bus", 25),
    # Odisha
    ("Odisha", "Bhubaneswar", "Master Canteen", "Lingaraj Temple", "Master Canteen Stand", "Lingaraj Gate", "Local Bus", 25),
    ("Odisha", "Bhubaneswar", "KIIT Square", "Nandankanan", "KIIT Stand", "Zoo Gate", "Local Bus", 40),
    ("Odisha", "Puri", "Puri Bus Stand", "Jagannath Temple", "Bus Stand", "Temple Gate", "E-Rickshaw", 30),
    # Puducherry
    ("Puducherry", "Puducherry", "Bus Stand", "Promenade Beach", "New Bus Stand", "Goubert Avenue", "Local Bus", 15),
    ("Puducherry", "Puducherry", "White Town", "Auroville Road", "White Town Stand", "Auroville Entry Road", "Tempo", 80),
    ("Puducherry", "Puducherry", "Railway Station", "Botanical Garden", "Station Stand", "Garden Gate", "E-Rickshaw", 25),
    # Punjab
    ("Punjab", "Amritsar", "Amritsar Station", "Golden Temple", "Station Stand", "Temple Complex", "Local Bus", 20),
    ("Punjab", "Amritsar", "Hall Gate", "Jallianwala Bagh", "Hall Gate Stand", "Bagh Gate", "E-Rickshaw", 20),
    ("Punjab", "Chandigarh Side", "Mohali Phase 7", "Sukhna Lake Road", "Phase 7 Stand", "Lake Approach", "Local Bus", 30),
    # Rajasthan
    ("Rajasthan", "Jaipur", "Sindhi Camp", "Hawa Mahal", "Sindhi Camp Bus Stand", "Hawa Mahal Road", "Local Bus", 25),
    ("Rajasthan", "Jaipur", "Railway Station", "Amber Fort", "Station Stand", "Amber Fort Base", "Tempo", 80),
    ("Rajasthan", "Udaipur", "City Palace", "Lake Pichola Jetty", "Palace Gate", "Boat Jetty", "Local Bus", 20),
    # Sikkim
    ("Sikkim", "Gangtok", "MG Marg", "Rumtek Monastery", "MG Marg Stand", "Rumtek Gate", "Tempo", 100),
    ("Sikkim", "Gangtok", "Deorali", "Tsomgo Lake Road", "Deorali Stand", "Lake Check Post Road", "Tempo", 200),
    ("Sikkim", "Gangtok", "Lal Bazaar", "Ganesh Tok", "Lal Bazaar Stand", "Ganesh Tok Viewpoint", "Local Bus", 40),
    # Tamil Nadu
    ("Tamil Nadu", "Chennai", "Parry's Corner", "Marina Beach", "Broadway Stand", "Marina Lighthouse", "Local Bus", 20),
    ("Tamil Nadu", "Chennai", "Central Station", "Kapaleeshwarar Temple", "Central Stand", "Mylapore Temple", "Local Bus", 25),
    ("Tamil Nadu", "Madurai", "Periyar Bus Stand", "Meenakshi Temple", "Periyar Stand", "Temple East Gate", "Local Bus", 20),
    # Telangana
    ("Telangana", "Hyderabad", "Secunderabad", "Charminar", "Secunderabad Station", "Charminar Circle", "Local Bus", 30),
    ("Telangana", "Hyderabad", "Ameerpet", "Hussain Sagar", "Ameerpet Metro", "Necklace Road", "Local Bus", 25),
    ("Telangana", "Hyderabad", "Gachibowli", "Golconda Fort", "Gachibowli Stand", "Fort Entrance", "Tempo", 100),
    # Tripura
    ("Tripura", "Agartala", "Agartala Market", "Ujjayanta Palace", "Battala Stand", "Palace Gate", "E-Rickshaw", 30),
    ("Tripura", "Agartala", "ISBT Agartala", "Neermahal Road", "ISBT Gate", "Lake Approach", "Tempo", 80),
    ("Tripura", "Agartala", "Motor Stand", "Jagannath Temple", "Motor Stand", "Temple Gate", "Local Bus", 20),
    # Uttar Pradesh
    ("Uttar Pradesh", "Lucknow", "Charbagh", "Bara Imambara", "Charbagh Stand", "Imambara Gate", "Local Bus", 25),
    ("Uttar Pradesh", "Varanasi", "Cantt Station", "Dashashwamedh Ghat", "Cantt Stand", "Ghat Steps", "Tempo", 50),
    ("Uttar Pradesh", "Agra", "Agra Cantt", "Taj Mahal", "Cantt Stand", "East Gate", "Local Bus", 40),
    ("Uttar Pradesh", "Prayagraj", "Civil Lines", "Triveni Sangam", "Civil Lines Stand", "Sangam Ghat", "Tempo", 60),
    # Uttarakhand
    ("Uttarakhand", "Dehradun", "ISBT Dehradun", "Robber's Cave", "ISBT Stand", "Guchhupani Entry", "Local Bus", 40),
    ("Uttarakhand", "Haridwar", "Haridwar Station", "Har Ki Pauri", "Station Stand", "Ghat Steps", "Local Bus", 20),
    ("Uttarakhand", "Rishikesh", "Rishikesh Bus Stand", "Laxman Jhula", "Bus Stand", "Jhula Gate", "Tempo", 40),
    # West Bengal
    ("West Bengal", "Kolkata", "Howrah Station", "Victoria Memorial", "Howrah Stand", "Victoria Gate", "Local Bus", 20),
    ("West Bengal", "Kolkata", "Esplanade", "Kalighat Temple", "Esplanade Stand", "Temple Gate", "Local Bus", 25),
    ("West Bengal", "Darjeeling", "Darjeeling Mall", "Tiger Hill Road", "Mall Stand", "Tiger Hill Base Road", "Tempo", 120),
]


def seed() -> None:
    db = get_session_factory()()
    try:
        created = 0
        base_date = date.today() + timedelta(days=3)
        for idx, (state, city, frm, to, pickup, drop, ttype, price) in enumerate(LOCAL_ROUTES):
            name = f"{city} Local — {frm} → {to}"
            exists = db.scalar(
                select(Ticket).where(
                    Ticket.state == state,
                    Ticket.from_location == frm,
                    Ticket.to_location == to,
                )
            )
            if exists:
                continue
            hour = 7 + (idx % 10)
            minute = (idx * 7) % 60
            db.add(
                Ticket(
                    name=name[:200],
                    type=ttype,
                    state=state,
                    from_location=frm,
                    to_location=to,
                    pickup=pickup,
                    drop=drop,
                    date=base_date + timedelta(days=idx % 5),
                    time=time(hour=hour, minute=minute),
                    price=Decimal(price),
                    status="Active",
                )
            )
            created += 1
        db.commit()
        total = db.scalar(select(func.count()).select_from(Ticket)) or 0
        states = db.scalars(select(Ticket.state).distinct().order_by(Ticket.state)).all()
        print(f"Created {created} local tickets. Total tickets now: {total}")
        print(f"States/UTs covered: {len(states)}")
        for s in states:
            print(f"  - {s}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
