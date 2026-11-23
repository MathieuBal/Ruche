# Le Rucher

Une ruche en bois déjà habitée, vue du dessus dans un jardin. Touchez la ruche pour entrer dans la coupe, suivre le couvain et observer la même colonie au fil des saisons. Les contrôles permettent de mettre l'observation en pause et d'accélérer les jours.

Ouvrir `index.html` dans un navigateur. Le projet est statique et fonctionne sans installation. Pour vérifier le moteur, exécuter `node --test tests/engine.cjs`.

## Modèle

Les ouvrières et le couvain sont simulés par groupes d'âge. Les abeilles dessinées échantillonnent la population et les sorties calculées. Les floraisons, la météo et les rendements correspondent à un jardin tempéré fictif. La simulation suit la ruche mère après un essaimage. Le jardin est une composition Canvas de branches articulées, de plantes enracinées, d’herbes, d’un bassin et d’une ruche indépendante. Les éléments partagent un champ de vent. Les dessins des plantes et de la ruche proviennent d’un atlas généré, le sol utilise une texture de prairie. La coupe intérieure conserve son illustration. Les papillons sont décoratifs. Le rendu est limité à 30 images par seconde.

### Sources publiques

- [Honey Bee Management Throughout the Seasons, Penn State Extension](https://extension.psu.edu/honey-bee-management-throughout-the-seasons)
- [Coping with the cold and fighting the heat: thermal homeostasis of a superorganism, the honeybee colony](https://doi.org/10.1007/s00359-021-01464-8)
- [Guide apicole MP577, University of Arkansas](https://www.uaex.uada.edu/publications/pdf/MP577.pdf)
