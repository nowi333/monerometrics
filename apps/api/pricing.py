"""Calculs de prix sans dependance : ils doivent rester testables seuls."""


def round_trip_cost(ask, bid):
    """Ce que coute un aller-retour, rapporte au capital engage.

    On achete a `ask` et on revend a `bid` : 1 000 $ engages ressortent
    1 000 x bid / ask. La perte est donc 1 - bid / ask du capital.
    Le rapport inverse (ask / bid - 1) mesure le meme ecart, mais rapporte
    au produit de la revente : il donne un chiffre plus gros qui ne repond
    pas a la question « combien ai-je perdu sur ce que j'ai mis ».
    """
    if not ask or not bid or ask <= 0:
        return None
    return round((1 - bid / ask) * 100, 2)
