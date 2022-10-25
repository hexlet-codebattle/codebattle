# Функция на проверку равенства числа в кубе, числу в квадрате

while True:
    print("""Функция на проверку равенства числа в кубе, числу в квадрате.
Для выхода введите 0.""")
    first = int (input ('Введите число 1: '))
    if first == int('0'):
	break
    second = int (input ('Введите число 2: '))
    if second == int('0'):
        break
    def solution (first, second):
        if int(first ** 3) == int(second ** 2):
            print(first ** 3, second ** 2, True)
        else:
            print(first ** 3, second ** 2, False)

    print(solution(first, second))
