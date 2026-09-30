import openpyxl
import os

desc_map = {
    'Your Name': 'Two teenagers share a profound, magical connection upon discovering they are swapping bodies.',
    'Suzume': 'A young girl teams up with a mysterious young man to close magical doors causing disasters across Japan.',
    'I Want To Eat Your Pancreas': 'An aloof boy discovers his popular classmate is secretly suffering from a fatal pancreatic illness.',
    'Weathering With You': 'A runaway high school boy in Tokyo meets a girl who has the power to manipulate the weather.',
    'Garden of Words': 'A student aspiring to be a shoemaker and a mysterious older woman find solace in each other on rainy mornings.',
    'Horimiya': 'Two seemingly very different high schoolers discover each other\'s hidden sides and form a close bond.',
    'Demon Slayer': 'A kind-hearted boy becomes a demon slayer to avenge his family and cure his demon-turned sister.',
    'Your Lie in April': 'A piano prodigy who lost his ability to hear the piano meets a free-spirited violinist who brings color back to his life.',
    'Tunnel To The Summer': 'Two teenagers investigate a mysterious tunnel that can grant wishes, but at a heavy cost of time.',
    'Ride Your Wave': 'A surfer and a firefighter fall in love, but tragedy strikes, leading to supernatural encounters.',
    '5cm Per Second': 'A poignant tale of two childhood friends drifting apart over time and distance.',
    'Rascal Does Not Dream of Bunny Girl Senpai': 'A high schooler helps girls suffering from "Puberty Syndrome," starting with a forgotten teen actress.',
    'My Dress Up Darling': 'A doll-artisan enthusiast helps his popular classmate create cosplay outfits, blossoming into a sweet romance.',
    'To the Forest of Firefly Lights': 'A young girl befriends a forest spirit who will disappear forever if touched by a human.',
    'Dan Da Dan': 'Two eccentric high schoolers get entangled in insane battles involving ghosts and aliens.',
    'Cosmic Princess Kaguya': 'A beautifully animated reimagining of the classic Japanese folktale of the Bamboo Cutter.',
    "To Every You I've Loved Before": 'A sci-fi romance exploring parallel universes and the choices that define true love.',
    'To Me the One Who Loved You': 'The companion piece to "To Every You", showing the alternate universe path of love and sacrifice.',
    'Cyberpunk: Edgerunners': 'A street kid survives in a technology-obsessed city of the future by becoming a mercenary outlaw.',
    'Arcane': 'Set in the League of Legends universe, two sisters fight on rival sides of a war between two cities.',
    'A Silent Voice': 'A former bully seeks redemption by trying to befriend the deaf girl he tormented in elementary school.',
    'Grave of the Fireflies': 'A heartbreaking story of two siblings struggling to survive in Japan during the final months of WWII.',
    'The Anthem of the Heart': 'A girl who lost her voice magically after traumatizing her family learns to express herself through music.',
    'Attack on Titan': 'Humanity fights for survival against terrifying giant humanoids known as Titans.',
    'A Lull in the Sea': 'Childhood friends from a sea village must attend school on the surface, causing friction and romance.',
    'Hyouka': 'An energy-conserving high schooler joins the classic literature club and solves everyday mysteries.',
    'Darling in the Franxx': 'In a post-apocalyptic future, children pilot giant mechs to defend humanity against monstrous threats.',
    'Re:Zero': 'A young man is transported to a fantasy world with the ability to rewind time upon his death.',
    'Fireworks': 'A group of friends explore the nature of fireworks while a boy uses a mysterious orb to alter time.',
    'Hello World': 'A high schooler travels back in time to help his past self correct a mistake and save his love.',
    'Summer Ghost': 'Three troubled teens seek out an urban legend known as the Summer Ghost to find answers about life and death.',
    'Look Back': 'A beautiful, emotional one-shot about the complicated rivalry and friendship of two aspiring manga artists.',
    'Vinland Saga': 'A young viking warrior seeks revenge against the man who killed his father in a deeply philosophical historical epic.',
    'Death Note': 'A brilliant high school student discovers a supernatural notebook that kills anyone whose name is written in it.',
    'Clannad': 'A delinquent student finds meaning in life by helping a sweet, chronically ill girl revive the school drama club.',
    'Insomniacs After School': 'Two students suffering from insomnia find comfort in each other and the school\'s abandoned observatory.',
    'The Apothecary Diaries': 'A sharp-witted apothecary girl solves medical mysteries and political intrigue within the Emperor\'s inner palace.',
    'Jujutsu Kaisen': 'A high schooler consumes a cursed talisman and gets drawn into a dangerous world of Curses and Sorcerers.',
    'Anohana': 'Childhood friends reconnect years later to help the spirit of their deceased friend pass on.',
    '365 Days to the Wedding': 'Two awkward coworkers fake an engagement to avoid being transferred to a branch office in Siberia.',
    'Blue Box': 'A sweet sports romance about a badminton player and a basketball star living under the same roof.',
    'The Angel Next Door Spoils Me Rotten': 'An apathetic high school boy is slowly won over by his perfect, angelic neighbor who starts cooking for him.',
    'The Dangers in My Heart': 'A socially awkward boy with dark fantasies slowly falls in love with the quirky, popular girl in his class.',
    'More Than a Married Couple,  But Not Lovers': 'Two mismatched students are paired up for a bizarre "marriage practical" assignment in school.',
    'Kaguya-sama: Love Is War': 'Two brilliant student council leaders try to trick each other into confessing their love first.',
    'Toradora!': 'Two mismatched high schoolers team up to help each other confess to their respective crushes.',
    'Erased': 'A man travels back in time to his childhood to solve a string of kidnappings and save his classmate.',
    'Classroom of the Elite': 'Students in an ultra-competitive, cutthroat high school must use deception and strategy to rise to the top.',
    'Spy × Family': 'A spy, an assassin, and a telepathic child pretend to be a normal family for a high-stakes mission.',
    'Alya Sometimes Hides Her Feelings in Russian': 'A beautiful half-Russian girl mutters sweet things in Russian, unaware that her crush perfectly understands her.',
    'The Fragrant Flower Blooms with Dignity': 'A heartwarming romance between a student at a boys\' delinquent school and a girl from an elite academy.',
    "Howl's Moving Castle": 'A young woman cursed with an old body gets swept up in the magical world of a wizard named Howl.',
    'Chainsaw Man': 'A young man merges with his pet chainsaw devil and joins a government agency to hunt other devils.',
    'Too Many Losing Heroines!': 'A boy constantly finds himself comforting the girls who lose the "love triangles" in his school.',
    'Josee,  the Tiger and the Fish': 'A marine biology student becomes the caretaker for a stubborn, wheelchair-bound artist with big dreams.',
    "Takopi's Original Sin": 'A happy alien tries to bring joy to a deeply traumatized human girl, leading to a dark tragedy.',
    'Love Unseen Beneath the Clear Night Sky': 'A touching drama about connection and finding light in a dark world.',
    'Oh Boy,  Was I Wrong About Her': 'A comedic misunderstanding between two friends leads to unexpected romance.',
    'I Want to Love You Till Your Dying Day': 'An emotional drama focused on terminal illness, love, and living life to the fullest.',
    'I Want to End This Love Game': 'Childhood friends must navigate their shifting feelings and break the cycle of a complicated game.',
    'Lycoris Recoil': 'A secret organization of highly trained schoolgirls works in the shadows to maintain peace in Japan.',
    'Wind Breaker': 'A fierce delinquent joins a high school famous for brawling to fight for the town\'s safety.',
    'Colorful': 'A soul is given a second chance at life inhabiting the body of a suicidal middle schooler.',
    '86 Eighty-Six': 'Child soldiers are forced to pilot mechs in a brutal, racially-segregated war of survival.',
    'Fruits Basket (2019)': 'An orphaned girl is taken in by a family cursed to turn into Zodiac animals when hugged by the opposite sex.',
    'Golden Time': 'A law student suffering from amnesia must navigate his new college life, romance, and his forgotten past.',
    'Spirited Away': 'A young girl wanders into a magical world of spirits and must work in a bathhouse to free her parents.',
    "Hell's Paradise": 'A group of death-row convicts are sent to a beautiful but deadly island to find the elixir of life.',
    'Wolf Children': 'A single mother struggles to raise two half-wolf children while hiding their secret from society.',
    'Tokyo Ghoul': 'A college student survives a deadly attack but becomes a half-ghoul, forced to consume human flesh to survive.',
    'One Punch Man': 'An incredibly powerful hero who can defeat any opponent with a single punch struggles to find a challenge.',
    'Solo Leveling': 'The weakest hunter of mankind gains a mysterious system that allows him to level up endlessly.',
    'Hunter × Hunter': 'A young boy sets out on a perilous journey to become a Hunter and find his legendary father.',
    'Fullmetal Alchemist: Brotherhood': 'Two brothers use forbidden alchemy in an attempt to resurrect their mother, leading to a quest for the Philosopher\'s Stone.',
    "Frieren: Beyond Journey's End": 'An elf mage reflects on life, time, and relationships after completing a legendary decade-long quest.',
    'Haikyu!!': 'A short but incredibly athletic high schooler aims to revitalize his school\'s once-great volleyball team.',
    "Shikimori's Not Just a Cutie": 'A clumsy boy is constantly protected by his cool, incredibly capable, and adorable girlfriend.',
    'Saekano: How to Raise a Boring Girlfriend': 'An otaku recruits an ordinary classmate to be the heroine of his ultimate dating sim game.',
    'Date A Live': 'A high schooler must date powerful "Spirits" and make them fall in love to prevent catastrophic spatial quakes.',
    'The Daily Life of the Immortal King': 'An incredibly powerful teenager tries to live a normal high school life while hiding his god-like abilities.',
    'Food for the Soul': 'A soothing, slice-of-life journey through delicious cooking and heartwarming human connections.',
    "Can a Boy-Girl Friendship Survive? (No, It Can't!)": 'Two best friends navigate the messy boundaries between platonic friendship and romantic feelings.',
    'Botan Kamiina Fully Blossoms When Drunk': 'A calm and composed girl reveals a surprisingly wild and lovable side whenever she drinks.',
    'Pseudo Harem': 'A high school girl uses her drama club acting skills to play different "harem" archetypes for her crush.',
    'Love, Chunibyo & Other Delusions!': 'A former "chuunibyou" tries to live a normal high school life but is dragged into the delusions of a quirky classmate.',
    'I Made Friends with the Second Prettiest Girl in My Class': 'A quiet student befriends the slightly less popular, but far more interesting, girl in his class.',
    "Young Ladies Don't Play Fighting Games": 'Students at an elite girls\' school secretly clash in highly competitive arcade fighting games.',
    'Nisekoi: False Love': 'The heirs of two rival gang factions must pretend to be dating to prevent an all-out war.',
    'Her Blue Sky': 'A complex story of music, romance, and time-traveling regrets in a small Japanese town.',
    'The Place Promised in Our Early Days': 'Three childhood friends build a plane to reach a mysterious tower in an alternate-history divided Japan.',
    'ReLIFE': 'An unemployed 27-year-old is given a pill that makes him look 17 so he can redo his final year of high school.',
    'Whisper of the Heart': 'A young girl who loves reading discovers her true passion for writing while falling for an aspiring violin maker.',
    'The Girl Who Leapt Through Time': 'A high school girl discovers she can literally leap backwards through time and uses it for trivial things.',
    'Akame ga Kill!': 'A country boy joins a group of assassins to overthrow a deeply corrupt and ruthless empire.',
    'ēlDLIVE': 'A boy who hears voices is recruited into an intergalactic space police force.',
    'Kizumonogatari': 'The dark, visually stunning prequel to the Monogatari series exploring a boy\'s fateful encounter with a vampire.',
    'Beyond the Boundary': 'A half-youmu boy meets a spirit warrior girl who uses her cursed blood as a weapon.',
    'K-On!': 'Four high school girls revive the light music club, drinking tea and slowly becoming a real band.',
    'Kimi ni Todoke: From Me to You': 'A sweet, misunderstood girl who looks like Sadako from The Ring slowly makes friends and finds love.',
    'Your Letter': 'A magical, heartwarming mystery about finding letters from a secret friend at a new school.',
    'Sakura Quest': 'A young woman from Tokyo accidentally becomes the "Queen" of a struggling rural town\'s tourism board.',
    'We Never Learn: BOKUBEN': 'A diligent student must tutor two genius girls in their weakest subjects to secure a scholarship.',
    'Angel Beats!': 'Teens in an afterlife purgatory form a rebellion against God while trying to resolve their lingering regrets.',
    'To Your Eternity': 'An immortal orb takes the form of things it encounters, learning about humanity through love and loss.',
    'You, Fireworks, and Our Promise': 'A poignant short film about fleeting summer memories and unbroken promises.',
    'The Dreaming Boy Is a Realist': 'A devoted boy suddenly gives up on his crush, causing her to realize she actually misses his attention.'
}

xlsx_path = 'assets/data/anime.xlsx'
wb = openpyxl.load_workbook(xlsx_path)
sheet = wb.active

headers = [cell.value for cell in sheet[1]]
if 'Description' not in headers:
    desc_col_idx = len(headers) + 1
    sheet.cell(row=1, column=desc_col_idx, value='Description')
else:
    desc_col_idx = headers.index('Description') + 1

name_col_idx = headers.index('Name') + 1

for row in range(2, sheet.max_row + 1):
    name = sheet.cell(row=row, column=name_col_idx).value
    if name in desc_map:
        sheet.cell(row=row, column=desc_col_idx, value=desc_map[name])

wb.save(xlsx_path)
print("Added Descriptions to Excel!")
