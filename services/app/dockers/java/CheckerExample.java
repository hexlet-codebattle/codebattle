import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

public class CheckerExample {
    public static void main(String... args) {
        try {
            Class<?> clazz = Class.forName("SolutionExample");
            Class[] argTypes = new Class[] {int.class, int.class};
            Object instance = clazz.getDeclaredConstructor().newInstance();
            Method method = clazz.getDeclaredMethod("solution", argTypes);

            Object[] args1 = {1, 2};
            int result = (int) method.invoke(instance, args1);
            System.out.println(result);
        } catch (ClassNotFoundException | InvocationTargetException | InstantiationException | NoSuchMethodException | IllegalAccessException e) {
            e.printStackTrace();
        }
    }
}
